import { Config, MqttConfig } from "./Config";


export default class Mqtt{
    private config:MqttConfig
    constructor(config:Config){
        this.config = config.get("mqtt");
        config.on("mqtt", (config)=>{
            this.onConfigChanged(config);
        });
    }
    private onConfigChanged(config:MqttConfig){

    }
    async open(){

    }
    async close(){

    }
}