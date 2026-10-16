import math
import unittest

from geometry import TireParameters, curved_edges, polar_cells, spoke_profiles


class GeometryTests(unittest.TestCase):
    def test_s_curve_ratio_controls_opposing_bends(self):
        left, right = spoke_profiles(TireParameters(mode='s_curve', s_curve_ratio=.15))[0]
        self.assertAlmostEqual((left[10][1]+right[10][1])/2, 5.1)
        self.assertAlmostEqual((left[30][1]+right[30][1])/2, -5.1)
        left, right = spoke_profiles(TireParameters(mode='s_curve', s_curve_ratio=0))[0]
        self.assertAlmostEqual((left[10][1]+right[10][1])/2, 0)

    def test_spoke_count_and_constant_normal_thickness(self):
        profiles = spoke_profiles(TireParameters(mode="vertical_spoke", spoke_count=24, spoke_thickness=2.5))
        self.assertEqual(len(profiles), 24)
        for left, right in profiles:
            for a, b in zip(left, right):
                self.assertAlmostEqual(math.dist(a, b), 2.5, places=8)

    def test_spoke_distance_sets_midpoint_bow(self):
        left, right = spoke_profiles(TireParameters(mode="vertical_spoke", spoke_distance=9))[0]
        self.assertAlmostEqual((left[20][1] + right[20][1]) / 2, 9)

    def test_default_cell_count(self):
        _, _, cells = polar_cells(TireParameters())
        self.assertEqual(len(cells), 60)

    def test_outer_cells_are_wider_in_polar_layout(self):
        _, _, cells = polar_cells(TireParameters())
        inner_edge = math.dist(cells[0][0], cells[0][1])
        outer_edge = math.dist(cells[-1][0], cells[-1][1])
        self.assertGreater(outer_edge, inner_edge)

    def test_first_order_curve_keeps_edge_endpoints(self):
        _, _, cells = polar_cells(TireParameters())
        edges = curved_edges(cells[0], 1.0)
        self.assertEqual(edges[0][0], cells[0][0])
        self.assertEqual(edges[0][-1], cells[0][1])


if __name__ == "__main__":
    unittest.main()
