import adsk.core
import adsk.fusion
import traceback
from lib.configurator import COMMANDS, PANEL_ID, component_name, pattern_parameter, validate_parameters
from lib.geometry import create_tire_component

WORKSPACE_ID = 'FusionSolidEnvironment'
TAB_ID = 'SolidTab'
handlers = []


def _values(command_inputs, pattern):
    # Fusion stores all length input values internally in centimetres.  The
    # geometry module and dialog labels intentionally use millimetres.
    values = {key: command_inputs.itemById(key).value * 10 for key in ('outer_diameter', 'inner_diameter', 'tire_width', 'outer_band', 'inner_band', 'thickness')}
    values['count'] = int(command_inputs.itemById('count').value)
    setting = pattern_parameter(pattern)
    setting_value = command_inputs.itemById(setting['id']).value
    values[setting['id']] = setting_value * 10 if setting['kind'] == 'length' else setting_value
    return values


class ExecuteHandler(adsk.core.CommandEventHandler):
    def __init__(self, pattern): super().__init__(); self.pattern = pattern
    def notify(self, args):
        try:
            command = adsk.core.CommandEventArgs.cast(args).command
            values = _values(command.commandInputs, self.pattern); valid, message = validate_parameters(values)
            if not valid: raise ValueError(message)
            design = adsk.fusion.Design.cast(adsk.core.Application.get().activeProduct)
            create_tire_component(design.rootComponent, component_name(self.pattern), values, self.pattern)
        except:
            adsk.core.Application.get().userInterface.messageBox(traceback.format_exc())


class CreatedHandler(adsk.core.CommandCreatedEventHandler):
    def __init__(self, pattern): super().__init__(); self.pattern = pattern
    def notify(self, args):
        command = adsk.core.CommandCreatedEventArgs.cast(args).command
        inputs = command.commandInputs
        defaults = [('outer_diameter', 'Outer diameter', '160 mm'), ('inner_diameter', 'Inner diameter', '80 mm'), ('tire_width', 'Tire width', '45 mm'), ('outer_band', 'OD thickness', '4 mm'), ('inner_band', 'ID thickness', '2 mm'), ('thickness', 'Web / spoke thickness', '2 mm')]
        for key, label, value in defaults: inputs.addValueInput(key, label, 'mm', adsk.core.ValueInput.createByString(value))
        inputs.addIntegerSpinnerCommandInput('count', 'Cells / curves', 3, 120, 1, 20)
        setting = pattern_parameter(self.pattern)
        if setting['kind'] == 'integer':
            inputs.addIntegerSpinnerCommandInput(setting['id'], setting['label'], setting['minimum'], setting['maximum'], 1, setting['default'])
        elif setting['kind'] == 'float':
            inputs.addFloatSpinnerCommandInput(setting['id'], setting['label'], '', setting['minimum'], setting['maximum'], 0.05, setting['default'])
        else:
            inputs.addValueInput(setting['id'], setting['label'], 'mm', adsk.core.ValueInput.createByString(setting['default']))
        handler = ExecuteHandler(self.pattern); command.execute.add(handler); handlers.append(handler)


def run(context):
    ui = adsk.core.Application.get().userInterface
    workspace = ui.workspaces.itemById(WORKSPACE_ID); tab = workspace.toolbarTabs.itemById(TAB_ID)
    panel = tab.toolbarPanels.itemById(PANEL_ID) or tab.toolbarPanels.add(PANEL_ID, 'Airless Tire Configurator', '', False)
    for item in COMMANDS:
        definition = ui.commandDefinitions.itemById(item['id']) or ui.commandDefinitions.addButtonDefinition(item['id'], item['name'], f"Create a {item['name']} airless tire.", '')
        handler = CreatedHandler(item['pattern']); definition.commandCreated.add(handler); handlers.append(handler)
        if not panel.controls.itemById(item['id']): panel.controls.addCommand(definition)


def stop(context):
    ui = adsk.core.Application.get().userInterface
    workspace = ui.workspaces.itemById(WORKSPACE_ID); tab = workspace.toolbarTabs.itemById(TAB_ID)
    panel = tab.toolbarPanels.itemById(PANEL_ID)
    if panel: panel.deleteMe()
    for item in COMMANDS:
        definition = ui.commandDefinitions.itemById(item['id'])
        if definition: definition.deleteMe()
    handlers.clear()
