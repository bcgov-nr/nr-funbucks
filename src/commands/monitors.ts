import { Command, Flags } from "@oclif/core";
import * as fs from "fs";
const path = require("path");

export default class Monitors extends Command {
  static description = "generate monitor configuration";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static args = [{ name: "file" }];

  public async run(): Promise<void> {

    type Monitor = {
      name: string;
      server: string;
      agent: string;
    };

    const { args, flags } = await this.parse(Monitors);
    const monitorJson = function (): string {
      let monitorsList: Monitor[] = [];
      const ipFile = fs
        .readFileSync(path.join("scripts", "fluentbit_agents.csv"), "utf-8")
        .trim();
      const serverList = ipFile.split("\n");
      let op = "";
      for (let i of serverList) {
        const serverName = i.split(",")[0];
        const agentCount = Number(i.split(",")[1]);
        for (let j = 0; j < agentCount; j++) {
          const monitor: Monitor = {
            name: "nrm_" + serverName + "_fluent-bit." + j,
            server: serverName,
            agent: "fluent-bit." + j,
          };
          monitorsList.push(monitor);
        }
      }
      return JSON.stringify(monitorsList, null, 2);
    };

    fs.writeFile(
      path.join("output", "monitors.json"),
      monitorJson(),
      function (err) {
        if (err) {
          return console.error(err);
        }
        console.log("monitors.json created in the output folder");
      }
    );
  }
}
