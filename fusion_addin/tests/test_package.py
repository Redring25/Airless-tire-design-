import unittest
from pathlib import Path
from zipfile import ZipFile


ROOT = Path(__file__).parents[2]
ARCHIVE = ROOT / 'docs' / 'downloads' / 'SophiStudio-Airless-Tire-Configurator.zip'


class PackageTests(unittest.TestCase):
    def test_archive_contains_complete_fusion_addin(self):
        with ZipFile(ARCHIVE) as package:
            names = set(package.namelist())
        required = {
            'AirlessTireConfigurator/AirlessTireConfigurator.py',
            'AirlessTireConfigurator/AirlessTireConfigurator.manifest',
            'AirlessTireConfigurator/lib/configurator.py',
            'AirlessTireConfigurator/lib/geometry.py',
            'AirlessTireConfigurator/README.md',
        }
        self.assertTrue(required.issubset(names))

    def test_website_links_to_the_addin_archive(self):
        page = (ROOT / 'docs' / 'index.html').read_text(encoding='utf-8')
        self.assertIn('./downloads/SophiStudio-Airless-Tire-Configurator.zip', page)


if __name__ == '__main__':
    unittest.main()
