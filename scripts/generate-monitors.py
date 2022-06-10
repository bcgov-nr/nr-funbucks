# Install Python
# run python3 generate-monitors.py
ipFileHandler = open("fluentbit_agents.csv", "r")
numLines = sum(1 for line in ipFileHandler)
ipFileHandler.seek(0)
opFileHandler = open("../output/monitors.json", "w")
opFileHandler.write("[\n  ")
j = 0
for line in ipFileHandler:
    arr = line.split(",")
    server = arr[0]
    agentCount = int(arr[1])
    j = j + 1
    for i in range(agentCount): 
        opFileHandler.write("{\n  ")
        opFileHandler.write('  "name": "nrm_' + server + '_fluent-bit.' + str(i) + '",')
        opFileHandler.write("\n  ")
        opFileHandler.write('  "server": "'+ server + '",')
        opFileHandler.write("\n  ")
        opFileHandler.write('  "agent": ' + '"fluent-bit.' + str(i) + '"')
        opFileHandler.write("\n  ")
        opFileHandler.write("}")
        if(j!=numLines or (j==numLines and i==agentCount)):
            opFileHandler.write(",\n  ")
opFileHandler.write("\n]")
opFileHandler.close()
ipFileHandler.close()
