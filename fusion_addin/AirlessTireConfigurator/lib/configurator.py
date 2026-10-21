"""Pure configuration helpers shared by the Fusion 360 add-in."""

PANEL_ID = 'SophiStudioAirlessPanel'

COMMANDS = (
    {'id': 'SophiStudioAirlessHoneycomb', 'name': 'Honeycomb straight', 'pattern': 'honeycomb'},
    {'id': 'SophiStudioAirlessVerticalSpoke', 'name': 'Vertical spoke', 'pattern': 'vertical_spoke'},
    {'id': 'SophiStudioAirlessSCurve', 'name': 'S-curve spoke', 'pattern': 's_curve'},
    {'id': 'SophiStudioAirlessAuxetic', 'name': 'Auxetic shape', 'pattern': 'auxetic'},
)

DISPLAY_NAMES = {
    'honeycomb': 'Honeycomb Straight',
    'vertical_spoke': 'Vertical Spoke',
    's_curve': 'S-curve Spoke',
    'auxetic': 'Auxetic Shape',
}

PATTERN_PARAMETERS = {
    'honeycomb': {'id': 'layers', 'label': 'Honeycomb layers', 'kind': 'integer', 'default': 2, 'minimum': 1, 'maximum': 6},
    'vertical_spoke': {'id': 'bow', 'label': 'Curve distance', 'kind': 'length', 'default': '8 mm'},
    's_curve': {'id': 's_ratio', 'label': 'S-curve ratio', 'kind': 'float', 'default': 0.25, 'minimum': 0.05, 'maximum': 0.8},
    'auxetic': {'id': 'cell_depth', 'label': 'Auxetic cell depth', 'kind': 'length', 'default': '8 mm'},
}


def component_name(pattern):
    return 'Airless Tire — ' + DISPLAY_NAMES[pattern]


def pattern_parameter(pattern):
    return PATTERN_PARAMETERS[pattern]


def validate_parameters(values):
    required = ('outer_diameter', 'inner_diameter', 'tire_width', 'outer_band', 'inner_band', 'thickness')
    try:
        numbers = {key: float(values[key]) for key in required}
    except (KeyError, TypeError, ValueError):
        return False, 'Enter valid numeric dimensions.'
    if any(value <= 0 for value in numbers.values()):
        return False, 'All dimensions must be positive.'
    if numbers['outer_diameter'] <= numbers['inner_diameter']:
        return False, 'Outer diameter must exceed inner diameter.'
    radial_gap = (numbers['outer_diameter'] - numbers['inner_diameter']) / 2
    if numbers['outer_band'] + numbers['inner_band'] >= radial_gap:
        return False, 'Boundary rings leave no pattern gap.'
    return True, ''
