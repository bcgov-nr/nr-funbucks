import * as fs from 'fs';

const ipFile = fs.readFileSync('scripts/fluentbit_agents.csv', 'utf-8').trim();

const serverList = ipFile.split('\n');

const monitorJson = function(): string {
    let op = "[\n  ";
    for (let i in serverList) {
        let server = serverList[i].split(',')[0];
        let agentCount = Number(serverList[i].split(',')[1]);
        for (let j=0; j<agentCount; j++)
        { 
            op += "{\n  ";
            op += '  "name": "nrm_' + server + '_fluent-bit.' + j + '",'
            op += "\n  ";
            op += '  "server": "'+ server + '",'
            op += "\n  ";
            op += '  "agent": ' + '"fluent-bit.' + j + '"';
            op += "\n  ";
            op += "}";
            if(!(Number(i)>=serverList.length-1 && j==agentCount-1)) {
                op += ",\n  ";
            }
        }  
    }
    op +=  "\n]";
    return op;
}

fs.writeFile('output/monitors.json', monitorJson(),  function(err) {
    if (err) {
        return console.error(err);
    }
    console.log("File created!");
});