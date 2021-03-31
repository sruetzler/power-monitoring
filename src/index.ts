import { getConfig } from "lib/Config";
import Monitor from "lib/Monitor";


async function execute(){
    const config = await getConfig();
    const monitor = new Monitor(config);
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

start();