const _module :any = {exports: {}};
process.env.NODE_PATH = process.cwd();
require("module").Module._initPaths();

import { getConfig, Config } from "lib/Config";
import Monitor from "lib/Monitor";

let config:Config, monitor:Monitor;

async function execute(){
    config = await getConfig();
    monitor = new Monitor(config);
    await monitor.start();
}

async function start(){
    try{
        await execute();
    }catch(err){
        console.error(err);
        process.exit(-1);
    }
}
process.on('SIGINT', terminate('SIGINT'));
process.on('SIGTERM', terminate('SIGTERM'));

function terminate(signal:string) { return function() {
    console.log('Got signal '+signal+'. Shutting down...');
    if (monitor) monitor.stop();
    if (config) config.close();
};}

start();