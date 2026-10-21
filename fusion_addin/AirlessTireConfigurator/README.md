# Sophi Studio Airless Tire Configurator

## Install in Fusion 360

1. Extract this ZIP to a permanent folder, for example:
   `%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\AirlessTireConfigurator`
2. In Fusion 360, open **Utilities → Add-Ins → Scripts and Add-Ins**.
3. Choose the **Add-Ins** tab, click the green **+** button, and select `AirlessTireConfigurator.manifest`.
4. Select **Airless Tire Configurator** and click **Run**. Optionally tick **Run on Startup**.

## Use

Open the Design workspace and the Solid tab. The **Airless Tire Configurator** panel offers Honeycomb straight, Vertical spoke, S-curve spoke, and Auxetic shape commands. Choose a command, set dimensions in millimetres, and click OK to create a new named component.

Export the created component to STEP using Fusion 360's normal export tools.

## Remove

Stop the add-in in **Scripts and Add-Ins**, then remove its extracted folder. The add-in removes only its own panel and commands when stopped.
