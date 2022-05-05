const ethers = require("ethers");
const fs = require("fs");
const { argv } = require("process");

try {
  fs.mkdirSync("data");
} catch {}

// encoded topic corresponding to Transfer event
const sep20TransferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const withdrawVaultTopic ="0xf279e6a1f5e320cca91135676d9cb6e44ca8a08c0b88342bcdb1144f6511b568";
const createPairTopic = "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9";
const lpFactory = "0xe62983a68679834ed884b9673fb6af13db740ff0";
const emberaddress = "0x6BAbf5277849265b6738e75AEC43AEfdde0Ce88D";
// address for ember vaults
const embervault = "0xffbe92fda81f853bcf00d3c7686d5dad5a6600bb"

// smartbch rpc url
const rpcUrl = "https://global.uat.cash";

// instantiate ethers provider
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, {
  name: "smartbch",
  chainId: 10000,
});

// BigNumber zero
const zero = ethers.BigNumber.from(0);

async function currentBlockNumber() {
  return provider._getFastBlockNumber();
}

async function snapshot(targetBlockNumber) {
  // optional parameter to index only until this block number, otherwise until blockchain tip
  if (targetBlockNumber) {
    targetBlockNumber = parseInt(targetBlockNumber);
    if (!targetBlockNumber) {
      throw Error("Invalid target block number")
    }
  }

  const now = await currentBlockNumber();
  const scanBlockStop = targetBlockNumber || now;

  // block batching size 10000 is maximum
  const blockBatch = 10000;

  // lookup the checkpoint available
  const files = fs.readdirSync("data");
  const blocks = files.map(val => parseInt(val.slice(0, -5))).sort((a,b) => a-b).filter(val => val % blockBatch === 0 && val < scanBlockStop);

  // start at the checkpoint block found, otherwise nearest round block before first ember event
  const scanBlockStart = blocks.length ? blocks.slice(-1)[0] : 3050000;

  // load checkpoint data if available
  let balanceMap = {};
  if (blocks.length) {
    const data = JSON.parse(fs.readFileSync(`data/${scanBlockStart}.json`, "utf8"));
    for (log of data) {
      balanceMap[log.address] = ethers.BigNumber.from(log.bal);
    }
  }

  // main processing
  for (let i = scanBlockStart + 1; i < scanBlockStop; i += blockBatch) {
    const nextStop = i + blockBatch - 1;
    const to = nextStop > scanBlockStop ? scanBlockStop : nextStop;

    const params = {
      address: "0x6BAbf5277849265b6738e75AEC43AEfdde0Ce88D",
      fromBlock: i,
      toBlock: to,
      topics: [sep20TransferTopic, null, null],
    };
     const vaultparams = {
      topics: [withdrawVaultTopic, null, null],
      address: embervault,
      fromBlock: i,
      toBlock: to,
    };

    console.log(`Processing blocks from ${i} to ${to}`);

    // retreive logs and process EMBER transfers
    const logs      = await provider.getLogs(params);
    const vaultlogs = await provider.getLogs(vaultparams)

    for (const log of logs) {   
    //console.log(`${log.topics[1]}`)
    //console.log(`${log.topics[2]}`)
    //console.log(`${log.topics[4]}`)
      const from = "0x" + log.topics[1].substring(26)
    //console.log(`${from}`)
      const to = "0x" + log.topics[2].substring(26);
    //console.log(`${to}`)
      if (to !== ethers.constants.AddressZero && to !== lpFactory && to !== embervault)  {
        balanceMap[to] = (balanceMap[to] || zero).add(ethers.BigNumber.from(log.data));
        if (balanceMap[to].lte(0)) {
          
          // delete zero balances
          delete balanceMap[to];
        }
      }
    //console.log(`${from}`)
     if (to !== embervault){ 
    //console.log(balanceMap[from])   
    //console.log(`${ethers.BigNumber.from(log.data)}`)
    //console.log(`0x${log.topics[1].substring(26)}`)
    //console.log(`0x${log.topics[2].substring(26)}`)
    //console.log(log.data)
        balanceMap[from] = (balanceMap[from] ||zero).sub(ethers.BigNumber.from(log.data));
        if (balanceMap[from].lte(0)) {
      // delete zero balances
          delete balanceMap[from];
        }
      }
    }
    for (const vaultlog of vaultlogs) {
      const vaultuser = "0x" + vaultlog.topics[1].substring(26)
      balanceMap[vaultuser] = (balanceMap[vaultuser] || zero).sub(ethers.BigNumber.from(vaultlog.data));
    }

    // transform results and store checkpoint
    const values = Object.keys(balanceMap).map(key => ({ address: key, bal: balanceMap[key].toString() }));
    fs.writeFileSync(`data/${params.toBlock}.json`, JSON.stringify(values, null, 2));
  }

  return balanceMap;
}

module.exports = { snapshot, currentBlockNumber }
