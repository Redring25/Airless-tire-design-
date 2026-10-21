"""Fusion-specific solid construction helpers (millimetre inputs)."""
import math
import adsk.core
import adsk.fusion


def _circle_profile(component, radius):
    sketch = component.sketches.add(component.xYConstructionPlane)
    sketch.sketchCurves.sketchCircles.addByCenterRadius(adsk.core.Point3D.create(0, 0, 0), radius / 10.0)
    return sketch


def _extrude(component, sketch, distance_mm, name):
    profile = sketch.profiles.item(0)
    feature = component.features.extrudeFeatures.addSimple(profile, adsk.core.ValueInput.createByString(f'{distance_mm} mm'), adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
    feature.bodies.item(0).name = name
    return feature.bodies.item(0)


def _ring(component, outer_mm, inner_mm, width_mm, name):
    outer = _extrude(component, _circle_profile(component, outer_mm), width_mm, name + ' outer')
    inner = _extrude(component, _circle_profile(component, inner_mm), width_mm, name + ' cutter')
    combine = component.features.combineFeatures
    tools = adsk.core.ObjectCollection.create(); tools.add(inner)
    feature = combine.add(outer, tools, adsk.fusion.FeatureOperations.CutFeatureOperation)
    feature.bodies.item(0).name = name
    return feature.bodies.item(0)


def _segment(component, start_mm, end_mm, thickness_mm, width_mm, name):
    """Create one rectangular web around an arbitrary 2D segment."""
    start_x, start_y = start_mm
    end_x, end_y = end_mm
    dx, dy = end_x - start_x, end_y - start_y
    length = math.hypot(dx, dy)
    if length < 0.01:
        return None
    nx, ny = -dy / length * thickness_mm / 2, dx / length * thickness_mm / 2
    points = [(start_x + nx, start_y + ny), (end_x + nx, end_y + ny), (end_x - nx, end_y - ny), (start_x - nx, start_y - ny)]
    sketch = component.sketches.add(component.xYConstructionPlane)
    lines = sketch.sketchCurves.sketchLines
    fusion_points = [adsk.core.Point3D.create(x / 10, y / 10, 0) for x, y in points]
    for point, next_point in zip(fusion_points, fusion_points[1:] + fusion_points[:1]):
        lines.addByTwoPoints(point, next_point)
    return _extrude(component, sketch, width_mm, name)


def _polar(radius, angle, tangent_offset=0):
    return (radius * math.cos(angle) - tangent_offset * math.sin(angle), radius * math.sin(angle) + tangent_offset * math.cos(angle))


def _pattern_points(pattern, inner_radius, outer_radius, angle, values, index):
    span = outer_radius - inner_radius
    if pattern == 'vertical_spoke':
        bow = float(values.get('bow', 0))
        return [_polar(inner_radius, angle), _polar(inner_radius + span / 2, angle, bow), _polar(outer_radius, angle)]
    if pattern == 's_curve':
        bow = span * float(values.get('s_ratio', 0.25))
        return [_polar(inner_radius, angle), _polar(inner_radius + span * .32, angle, bow), _polar(inner_radius + span * .68, angle, -bow), _polar(outer_radius, angle)]
    if pattern == 'auxetic':
        depth = float(values.get('cell_depth', span * .16))
        sign = 1 if index % 2 == 0 else -1
        return [_polar(inner_radius, angle, -sign * depth), _polar(inner_radius + span * .33, angle, sign * depth), _polar(inner_radius + span * .66, angle, -sign * depth), _polar(outer_radius, angle, sign * depth)]
    # The honeycomb command makes alternating six-sided cells across the annulus.
    offset = span * .17
    sign = 1 if index % 2 == 0 else -1
    return [_polar(inner_radius, angle, sign * offset), _polar(inner_radius + span * .25, angle, -sign * offset), _polar(inner_radius + span * .5, angle, sign * offset), _polar(inner_radius + span * .75, angle, -sign * offset), _polar(outer_radius, angle, sign * offset)]


def create_tire_component(root_component, name, values, pattern):
    occurrence = root_component.occurrences.addNewComponent(adsk.core.Matrix3D.create())
    component = occurrence.component; component.name = name
    outer, inner, width = values['outer_diameter'] / 2, values['inner_diameter'] / 2, values['tire_width']
    outer_web, inner_web = outer - values['outer_band'], inner + values['inner_band']
    _ring(component, outer, outer_web, width, 'Outer boundary ring')
    _ring(component, inner_web, inner, width, 'Inner boundary ring')
    count = int(values.get('count', 20)); thickness = values['thickness']
    layers = int(values.get('layers', 1)) if pattern == 'honeycomb' else 1
    for index in range(count):
        angle = 2 * math.pi * index / count
        for layer in range(layers):
            layer_inner = inner_web + (outer_web - inner_web) * layer / layers
            layer_outer = inner_web + (outer_web - inner_web) * (layer + 1) / layers
            points = _pattern_points(pattern, layer_inner, layer_outer, angle, values, index + layer)
            for segment, (start, end) in enumerate(zip(points, points[1:])):
                _segment(component, start, end, thickness, width, f'{pattern} web {index + 1}.{layer + 1}.{segment + 1}')
    return component
