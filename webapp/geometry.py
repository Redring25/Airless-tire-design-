"""CAD geometry for the SophiStudio Airless Tire Design web application."""

from __future__ import annotations

from dataclasses import dataclass
from math import cos, hypot, pi, sin
from pathlib import Path
from typing import Literal


Point = tuple[float, float]


@dataclass(frozen=True)
class TireParameters:
    mode: Literal["honeycomb", "first_order", "vertical_spoke", "s_curve", "auxetic"] = "honeycomb"
    inner_diameter: float = 80.0
    outer_diameter: float = 160.0
    tire_width: float = 45.0
    outer_band: float = 4.0
    inner_band: float = 2.0
    cells_per_layer: int = 20
    layers: int = 3
    web_thickness: float = 2.0
    curve_amplitude: float = 1.5
    spoke_thickness: float = 2.0
    spoke_count: int = 32
    spoke_distance: float = 8.0
    s_curve_ratio: float = 0.15
    auxetic_depth: float = 0.25


def validate_parameters(p: TireParameters) -> None:
    if p.inner_diameter <= 0 or p.outer_diameter <= p.inner_diameter:
        raise ValueError("Outer diameter must be larger than a positive inner diameter.")
    if p.tire_width <= 0 or p.outer_band <= 0 or p.inner_band <= 0:
        raise ValueError("Width and ID/OD band thicknesses must be positive.")
    if p.cells_per_layer < 3 or p.layers < 1:
        raise ValueError("Use at least 3 cells per layer and at least 1 layer.")
    if p.web_thickness <= 0 or p.curve_amplitude < 0:
        raise ValueError("Web thickness must be positive and curve amplitude cannot be negative.")
    inner_radius = p.inner_diameter / 2
    outer_radius = p.outer_diameter / 2
    if inner_radius + p.inner_band >= outer_radius - p.outer_band:
        raise ValueError("The ID and OD bands leave no room for honeycomb cells.")


def inset_polygon(points: list[Point], distance: float, concave: bool = False) -> list[Point]:
    signed_area = sum(
        points[i][0] * points[(i + 1) % len(points)][1]
        - points[(i + 1) % len(points)][0] * points[i][1]
        for i in range(len(points))
    )
    orientation = 1.0 if signed_area > 0 else -1.0
    lines: list[tuple[Point, Point]] = []
    for i, point in enumerate(points):
        end = points[(i + 1) % len(points)]
        dx, dy = end[0] - point[0], end[1] - point[1]
        length = hypot(dx, dy)
        nx, ny = orientation * -dy / length, orientation * dx / length
        lines.append(((point[0] + distance * nx, point[1] + distance * ny), (dx, dy)))

    result: list[Point] = []
    for i in range(len(points)):
        p1, d1 = lines[i - 1]
        p2, d2 = lines[i]
        denominator = d1[0] * d2[1] - d1[1] * d2[0]
        if abs(denominator) < 1e-9:
            raise ValueError("The selected cell geometry cannot be offset.")
        delta_x, delta_y = p2[0] - p1[0], p2[1] - p1[1]
        scale = (delta_x * d2[1] - delta_y * d2[0]) / denominator
        result.append((p1[0] + scale * d1[0], p1[1] + scale * d1[1]))

    for i, point in enumerate(points):
        end = points[(i + 1) % len(points)]
        dx, dy = end[0] - point[0], end[1] - point[1]
        length = hypot(dx, dy)
        nx, ny = orientation * -dy / length, orientation * dx / length
        if not concave and any((q[0] - point[0]) * nx + (q[1] - point[1]) * ny < distance - 1e-7 for q in result):
            raise ValueError("Web thickness is too large for the selected cell size.")
    return result


def polar_cells(p: TireParameters) -> tuple[float, float, list[list[Point]]]:
    validate_parameters(p)
    inner_radius, outer_radius = p.inner_diameter / 2, p.outer_diameter / 2
    web_inner, web_outer = inner_radius + p.inner_band, outer_radius - p.outer_band
    available = web_outer - web_inner
    if p.mode == "auxetic":
        if not .05 <= p.auxetic_depth <= .4:
            raise ValueError("Inward cell depth must be between 0.05 and 0.40.")
        pitch = available / p.layers
        angle_pitch = 2*pi/p.cells_per_layer
        if p.web_thickness >= min(pitch, web_inner*angle_pitch)*.25:
            raise ValueError("Wall thickness is too large for these auxetic cells.")
        cells = []
        waist = .5-p.auxetic_depth
        offsets = ((-.5,-.5),(.5,-.5),(waist,0),(.5,.5),(-.5,.5),(-waist,0))
        for layer in range(p.layers):
            center = web_inner+(layer+.5)*pitch
            for cell in range(p.cells_per_layer):
                raw = [((center+rf*pitch)*cos((cell+af)*angle_pitch), (center+rf*pitch)*sin((cell+af)*angle_pitch)) for af,rf in offsets]
                cells.append(inset_polygon(raw,p.web_thickness/2,concave=True))
                # Open the spaces between hourglass outlines too, leaving
                # slender re-entrant zigzag ribs instead of solid diamonds.
                gap_offsets = ((.5,-.5),(.5+p.auxetic_depth,0),(.5,.5),(.5-p.auxetic_depth,0))
                gap = [((center+rf*pitch)*cos((cell+af)*angle_pitch), (center+rf*pitch)*sin((cell+af)*angle_pitch)) for af,rf in gap_offsets]
                cells.append(inset_polygon(gap,p.web_thickness/2))
        return web_inner,web_outer,cells
    if p.layers == 1:
        radial_pitch = available
        layer_radii = [(web_inner + web_outer) / 2]
    else:
        radial_pitch = available / (p.layers - 1)
        layer_radii = [web_inner + i * radial_pitch for i in range(p.layers)]

    angle_pitch = 2 * pi / p.cells_per_layer
    offsets = ((0, -2/3), (.5, -1/3), (.5, 1/3), (0, 2/3), (-.5, 1/3), (-.5, -1/3))
    cells: list[list[Point]] = []
    for layer, center_radius in enumerate(layer_radii):
        stagger = .5 if layer % 2 else 0
        for cell in range(p.cells_per_layer):
            center_angle = (cell + stagger) * angle_pitch
            raw = []
            for angle_factor, radial_factor in offsets:
                angle = center_angle + angle_factor * angle_pitch
                radius = center_radius + radial_factor * radial_pitch
                raw.append((radius * cos(angle), radius * sin(angle)))
            cells.append(inset_polygon(raw, p.web_thickness / 2))
    return web_inner, web_outer, cells


def curved_edges(polygon: list[Point], amplitude: float, samples: int = 24) -> list[list[Point]]:
    signed_area = sum(
        polygon[i][0] * polygon[(i + 1) % len(polygon)][1]
        - polygon[(i + 1) % len(polygon)][0] * polygon[i][1]
        for i in range(len(polygon))
    )
    orientation = 1.0 if signed_area > 0 else -1.0
    edges: list[list[Point]] = []
    for i, start in enumerate(polygon):
        end = polygon[(i + 1) % len(polygon)]
        dx, dy = end[0] - start[0], end[1] - start[1]
        length = hypot(dx, dy)
        if amplitude > length * .35:
            raise ValueError("Curve amplitude is too large for the selected cells.")
        nx, ny = orientation * -dy / length, orientation * dx / length
        # Each side bows toward the cell centre, retaining all six corners.
        bend = amplitude
        edges.append([
            (
                start[0] + t * dx + bend * sin(pi * t) * nx,
                start[1] + t * dy + bend * sin(pi * t) * ny,
            )
            for t in (j / samples for j in range(samples + 1))
        ])
    return edges


def build_model(p: TireParameters):
    """Build the common solid used by STEP export and the 3D viewer."""
    import cadquery as cq

    if p.mode in {"vertical_spoke", "s_curve"}:
        return build_spoke_model(p)

    web_inner, web_outer, cells = polar_cells(p)
    height = p.tire_width
    result = (
        cq.Workplane("XY")
        .circle(p.outer_diameter / 2)
        .circle(p.inner_diameter / 2)
        .extrude(height)
    )
    clipping_ring = cq.Workplane("XY").circle(web_outer).circle(web_inner).extrude(height + 2).translate((0, 0, -1))

    for polygon in cells:
        if p.mode == "first_order" and p.curve_amplitude > 0:
            edges = []
            for samples in curved_edges(polygon, p.curve_amplitude):
                vectors = [cq.Vector(x, y, -1) for x, y in samples]
                edges.append(cq.Edge.makeSpline(vectors))
            wire = cq.Wire.assembleEdges(edges)
            face = cq.Face.makeFromWires(wire)
            cutter = cq.Workplane(obj=face).extrude(height + 2)
        else:
            cutter = cq.Workplane("XY").polyline(polygon).close().extrude(height + 2).translate((0, 0, -1))
        result = result.cut(cutter.intersect(clipping_ring))

    return result


def spoke_profiles(p: TireParameters, samples: int = 40):
    """Normal offsets of a bowed centreline give constant rib thickness."""
    validate_parameters(p)
    ri = p.inner_diameter / 2 + p.inner_band
    ro = p.outer_diameter / 2 - p.outer_band
    if p.spoke_count < 3 or p.spoke_thickness <= 0 or p.spoke_distance < 0:
        raise ValueError("Use at least 3 curves, positive thickness, and non-negative curve distance.")
    if p.spoke_thickness >= 2 * pi * ri / p.spoke_count * .8:
        raise ValueError("Curve thickness is too large for the number of curves.")
    if p.mode == "s_curve" and not 0 <= p.s_curve_ratio <= .3:
        raise ValueError("S-curve ratio must be between 0 and 0.30.")
    if p.mode != "s_curve" and p.spoke_distance > (ro - ri) * .7:
        raise ValueError("Curve distance must be at most 70% of the space between the rings.")
    # Embed endpoints slightly into both bands for a connected solid.
    overlap = min(p.inner_band, p.outer_band, p.spoke_thickness) * .25
    start, span = ri - overlap, ro - ri + 2 * overlap
    profiles = []
    for index in range(p.spoke_count):
        angle = 2 * pi * index / p.spoke_count
        sides = [[], []]
        for j in range(samples + 1):
            t = j / samples
            x, y = start + span * t, 4 * p.spoke_distance * t * (1 - t)
            dx, dy = span, 4 * p.spoke_distance * (1 - 2 * t)
            if p.mode == "s_curve":
                amplitude = p.s_curve_ratio * (ro-ri)
                y = amplitude * sin(2*pi*t)
                dy = amplitude * 2*pi*cos(2*pi*t)
            length = hypot(dx, dy)
            for side, sign in zip(sides, (1, -1)):
                px = x - sign * dy / length * p.spoke_thickness / 2
                py = y + sign * dx / length * p.spoke_thickness / 2
                side.append((px * cos(angle) - py * sin(angle), px * sin(angle) + py * cos(angle)))
        profiles.append(sides)
    return profiles


def spoke_branches(p: TireParameters, samples: int = 40):
    main = spoke_profiles(p, samples)
    branches = []
    for index, (left, right) in enumerate(main):
        midpoint = samples // 2
        a = tuple((left[midpoint][k] + right[midpoint][k]) / 2 for k in (0, 1))
        next_left, next_right = main[(index + 1) % len(main)]
        b = tuple((next_left[-1][k] + next_right[-1][k]) / 2 for k in (0, 1))
        dx, dy = b[0] - a[0], b[1] - a[1]
        length = hypot(dx, dy)
        bow = min(p.spoke_distance * .25, length * .15)
        control = ((a[0]+b[0])/2-dy/length*bow, (a[1]+b[1])/2+dx/length*bow)
        sides = [[], []]
        for j in range(samples + 1):
            t = j / samples
            x = (1-t)**2*a[0]+2*(1-t)*t*control[0]+t*t*b[0]
            y = (1-t)**2*a[1]+2*(1-t)*t*control[1]+t*t*b[1]
            tx = 2*((1-t)*(control[0]-a[0])+t*(b[0]-control[0]))
            ty = 2*((1-t)*(control[1]-a[1])+t*(b[1]-control[1]))
            tangent_length = hypot(tx, ty)
            for side, sign in zip(sides, (1, -1)):
                side.append((x-sign*ty/tangent_length*p.spoke_thickness/2, y+sign*tx/tangent_length*p.spoke_thickness/2))
        branches.append(sides)
    return branches


def build_spoke_model(p: TireParameters):
    import cadquery as cq
    profiles = spoke_profiles(p)
    if p.mode == "vertical_spoke":
        profiles += spoke_branches(p)
    ri, ro = p.inner_diameter / 2, p.outer_diameter / 2
    rings = cq.Workplane("XY").circle(ro).circle(ro-p.outer_band).extrude(p.tire_width)
    rings = rings.union(cq.Workplane("XY").circle(ri+p.inner_band).circle(ri).extrude(p.tire_width))
    for left, right in profiles:
        a = [cq.Vector(x,y,0) for x,y in left]
        b = [cq.Vector(x,y,0) for x,y in right]
        wire = cq.Wire.assembleEdges([
            cq.Edge.makeSpline(a), cq.Edge.makeLine(a[-1],b[-1]),
            cq.Edge.makeSpline(list(reversed(b))), cq.Edge.makeLine(b[0],a[0])
        ])
        rib = cq.Workplane(obj=cq.Face.makeFromWires(wire)).extrude(p.tire_width)
        rings = rings.union(rib)
    envelope = cq.Workplane("XY").circle(ro).circle(ri).extrude(p.tire_width)
    return rings.intersect(envelope)


def export_step(p: TireParameters, output_path: Path) -> None:
    import cadquery as cq
    cq.exporters.export(build_model(p), str(output_path), exportType="STEP")


def preview_mesh(p: TireParameters) -> dict:
    solid = build_model(p).val()
    vertices, triangles = solid.tessellate(0.25, 0.15)
    return {
        "volume_mm3": solid.Volume(),
        "surface_area_mm2": solid.Area(),
        "tire_width": p.tire_width,
        "vertices": [[v.x, v.y, v.z - p.tire_width / 2] for v in vertices],
        "triangles": triangles,
    }
