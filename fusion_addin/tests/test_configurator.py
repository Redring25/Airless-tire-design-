import unittest
from pathlib import Path
import sys
import json

ADDIN = Path(__file__).parents[1] / 'AirlessTireConfigurator'
sys.path.insert(0, str(ADDIN / 'lib'))

from configurator import COMMANDS, PANEL_ID, component_name, pattern_parameter, validate_parameters


class ConfiguratorTests(unittest.TestCase):
    def test_command_ids_are_ascii_and_use_the_required_prefix(self):
        self.assertEqual(len(COMMANDS), 4)
        self.assertTrue(all(item['id'].isascii() and item['id'].startswith('SophiStudioAirless') for item in COMMANDS))

    def test_rejects_inverted_diameters_and_closed_ring_gap(self):
        valid, _ = validate_parameters({'outer_diameter': 80, 'inner_diameter': 80, 'tire_width': 45, 'outer_band': 4, 'inner_band': 2, 'thickness': 2})
        self.assertFalse(valid)
        valid, _ = validate_parameters({'outer_diameter': 100, 'inner_diameter': 80, 'tire_width': 45, 'outer_band': 7, 'inner_band': 5, 'thickness': 2})
        self.assertFalse(valid)

    def test_component_names_are_human_readable(self):
        self.assertEqual(component_name('auxetic'), 'Airless Tire — Auxetic Shape')

    def test_each_pattern_has_its_own_adjustment(self):
        self.assertEqual(pattern_parameter('honeycomb')['id'], 'layers')
        self.assertEqual(pattern_parameter('vertical_spoke')['id'], 'bow')
        self.assertEqual(pattern_parameter('s_curve')['id'], 's_ratio')
        self.assertEqual(pattern_parameter('auxetic')['id'], 'cell_depth')

    def test_manifest_and_panel_identifier_are_valid(self):
        manifest = json.loads((ADDIN / 'AirlessTireConfigurator.manifest').read_text(encoding='utf-8'))
        self.assertFalse(manifest['runOnStartup'])
        self.assertEqual(PANEL_ID, 'SophiStudioAirlessPanel')

    def test_addin_creates_its_own_configurator_tab(self):
        source = (ADDIN / 'AirlessTireConfigurator.py').read_text(encoding='utf-8')
        self.assertIn("CONFIGURATOR_TAB_ID = 'SophiStudioAirlessTab'", source)
        self.assertIn("toolbarTabs.add(CONFIGURATOR_TAB_ID, 'Airless Tire Configurator')", source)


if __name__ == '__main__':
    unittest.main()
