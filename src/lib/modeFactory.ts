import { Mode, IMode } from "./definition";
import Learning from "./modes/Learning";
import Switch from "./Switch";
import { DeviceConfig, Config } from "./Config";
import Monitoring from "./modes/Monitoring";


export default async function(config:DeviceConfig,_switch:Switch, configClass:Config, userId:string, device:string):Promise<IMode>{
    let mode;
    switch (config.mode){
        case "learning":
            mode = new Learning(_switch, config, configClass, userId, device);
            break;
        case "monitoring":
            mode = new Monitoring(_switch, config, configClass, userId, device);
            break;
    }
    if (mode) await mode.open();
    return mode;
}