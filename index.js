const ecc = require('@bitcoinerlab/secp256k1')
const bip39 = require('bip39')
const { BIP32Factory } = require('bip32')
const { ECPairFactory } = require('ecpair')
const bip32 = BIP32Factory(ecc)
const bitcoin = require('bitcoinjs-lib')
const assert = require('assert')

function mergeArraysByHash(array1, array2) {
  const uniqueHashes = new Set(array1.map(item => item.hash));
  
  const uniqueObjectsFromArray2 = array2.filter(item2 => !uniqueHashes.has(item2.hash));
  
  return [...array1, ...uniqueObjectsFromArray2];
}




const ECPair = ECPairFactory(ecc)
const validator = (pubkey, msghash, signature) => {
  return ECPair.fromPublicKey(pubkey).verify(msghash, signature)
}

 class Wallet {
  constructor (mnemonic) {
    this.mnemonic = mnemonic
    this.path = 'm/0/0'
    this.extendedPrivKey = this.getXprv(mnemonic)
    this.extendedPubKey = this.getXpub(mnemonic)
    this.active = false
    this.activeAddresses = {
      change: [],
      receiving: []
    }
    this.addressHistory = {}
    this.unspentCoins = []
    this.txHistory = []
  }

  getXprv (mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const rootKey = bip32.fromSeed(seed)
    return rootKey.toBase58()
  }

  getXpub (mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const rootKey = bip32.fromSeed(seed)
    return rootKey.neutered().toBase58()
  }

  generateAddresses (quantity, isChange) {
    const rootKey = bip32.fromBase58(this.extendedPrivKey)
    const startIndex = isChange ? this.activeAddresses.change.length : this.activeAddresses.receiving.length
    const pathParts = this.path.split('/')

    for (let i = startIndex; i < startIndex + quantity; i++) {
      pathParts[1] = isChange ? 1 : 0
      pathParts[2] = i
      const finalPath = pathParts.join('/')

      const extendedKey = rootKey.derivePath(finalPath)
      const { address } = bitcoin.payments.p2wpkh({ pubkey: extendedKey.publicKey })

      if (!this.activeAddresses[isChange ? 'change' : 'receiving'].includes(address)) {
        this.activeAddresses[isChange ? 'change' : 'receiving'].push(address)
        this.addressHistory[address] = []
      }
    }
  }

  async checkForTxs () {
    let api = 'https://blockchain.info/multiaddr?active='
    const activeAddresses = [...this.activeAddresses.change, ...this.activeAddresses.receiving]
    api += activeAddresses.join('|')

    const response = await fetch(api)
    const data = await response.json()

    if (data.txs.length === 0) {
      return 'Wallet is inactive'
    }
    this.active = true
    
    this.txHistory=mergeArraysByHash(this.txHistory,data.txs)

    
    data.txs.forEach(tx => {
      tx.out.forEach(output => {
        if (output.addr in this.addressHistory) {
          if (!this.addressHistory[output.addr].includes(tx.hash)) {
            this.addressHistory[output.addr].push(tx.hash)
            this.addressHistory[output.addr].push(tx.block_height)
            if (!output.spent) {
              output.hash = tx.hash
              delete output.spending_outpoints
              delete output.type
              this.unspentCoins.push(output)
            }
          }
        }
      })
    })
  }
// we use this function to build the entire transaction, get the fee (Size in vbytes) and other relevant info without broadcasting it. the transaction is then built again with the according fee.
  getTxFee(hdRoot,inputs,receiver,value){
    if (inputs.length === 0){
      return 0
    }
    const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin })

    let totalInputValue = 0
    inputs.forEach(input => {
      psbt.addInput(input)
      totalInputValue +=input.witnessUtxo.value
    })

    psbt.addOutput({
      address: receiver,
      value
    })

    if(totalInputValue > value){
psbt.addOutput({
  address: this.getEmptyChangeAddr(),
  value: totalInputValue - value
})
    }

    let inputIndex = 0
    inputs.forEach(input => {
      psbt.signInputHD(inputIndex, hdRoot)// Must sign with root!!!
      inputIndex++
    })
    inputIndex = 0
    inputs.forEach(input => {
      const childNode = hdRoot.derivePath(input.bip32Derivation[0].path)
      assert.strictEqual(psbt.validateSignaturesOfInput(inputIndex, validator), true)
      assert.strictEqual(
        psbt.validateSignaturesOfInput(inputIndex, validator, childNode.publicKey),
        true
      )

      inputIndex++
    })

    psbt.finalizeAllInputs()

    const tx = psbt.extractTransaction().toHex()
    const transaction = bitcoin.Transaction.fromHex(tx);
const transactionSizeVbytes = transaction.virtualSize();

return transactionSizeVbytes
  }
  
  createTx (receiver,value,feeRate) {
    const inputs = this.getHdData(this.getInputData(value))
    if (inputs.length === 0){
      return "You don't have enough bitcoin"
    }
    const hdRoot = bip32.fromBase58(this.extendedPrivKey)
    const fee = (this.getTxFee(hdRoot,inputs,receiver,value)+4)*feeRate
    
    const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin })

    let totalInputValue = 0
    inputs.forEach(input => {
      psbt.addInput(input)
      totalInputValue +=input.witnessUtxo.value
    })

    psbt.addOutput({
      address: receiver,
      value
    })

    if(totalInputValue >= value+fee){
      if(totalInputValue - value - fee > 600){
psbt.addOutput({
  address: this.getEmptyChangeAddr(),
  value: totalInputValue - value - fee
})}

}else throw new Error("You don't have enough Bitcoin. please adjust fee or amount to send.")

    

    let inputIndex = 0
    inputs.forEach(input => {
      psbt.signInputHD(inputIndex, hdRoot)// Must sign with root!!!
      inputIndex++
    })
    inputIndex = 0
    inputs.forEach(input => {
      const childNode = hdRoot.derivePath(input.bip32Derivation[0].path)
      assert.strictEqual(psbt.validateSignaturesOfInput(inputIndex, validator), true)
      assert.strictEqual(
        psbt.validateSignaturesOfInput(inputIndex, validator, childNode.publicKey),
        true
      )

      inputIndex++
    })

    psbt.finalizeAllInputs()

    const rawTx = psbt.extractTransaction().toHex()
    const tx = bitcoin.Transaction
    const nextChangeAddr = this.activeAddresses.change[this.activeAddresses.change.length-1]
    const jsonTx = {
      hash:tx.fromHex(rawTx).getHash().toString("hex"),
      inputs:inputs,
      outputs:[
        {receiver: receiver,value:value},
        totalInputValue >= value + fee && totalInputValue - value-fee > 600? {receiver:nextChangeAddr,value:totalInputValue - value - fee}:null

      ]
  }
    return {rawTx,jsonTx}

  }

  // Gathers the right inputs for our transaction. is then passed as an argument to getHdData()
  getInputData (amount) {
    let hash = ''
    let index = 0
    let addr = ''
    let mixin = {}
    const allInputs = []
    let totalAmount = 0
    const coin = JSON.parse(JSON.stringify(this.unspentCoins));
    for (let i = 0; i <= coin.length - 1; i++) {
      if (amount >= coin[i].value) {
        totalAmount += coin[i].value
        hash = coin[i].hash
        index = coin[i].n
        addr = coin[i].addr
        const witnessUtxo = this.getWitnessUtxo(coin[i])
        mixin = { witnessUtxo }
        allInputs.push({ addr, hash, index, ...mixin })
        if (totalAmount >= amount) {
          return allInputs
        }
      } else {
        hash = coin[i].hash
        index = coin[i].n
        addr = coin[i].addr
        const witnessUtxo = this.getWitnessUtxo(coin[i])
        mixin = { witnessUtxo }
        allInputs.push({ addr, hash, index, ...mixin })
        return allInputs
      }
    }
    return []
  }

  getWitnessUtxo (out) {
    delete out.addr
    delete out.spent
    delete out.n
    delete out.tx_index
    out.script = Buffer.from(out.script, 'hex')
    return out
  }

  // gets the extended keys needed for each input holding address
  getHdData (inputData) {
    const hdRoot = bip32.fromBase58(this.extendedPrivKey)
    const masterFingerprint = hdRoot.fingerprint
    inputData.forEach(input => {
      const pathParts = this.path.split('/')
      let pathIndex = this.activeAddresses.receiving.indexOf(input.addr)
      if (pathIndex === -1) {
        pathParts[1] = 1
        pathIndex = this.activeAddresses.change.indexOf(input.addr)
      }
      pathParts[2] = pathIndex
      const finalPath = pathParts.join('/')
      const childNode = hdRoot.derivePath(finalPath)
      const pubkey = childNode.publicKey

      const updateData = {
        bip32Derivation: [
          {
            masterFingerprint,
            path: finalPath,
            pubkey
          }
        ]
      }
      const { addr, hash, index, witnessUtxo } = input
      assert.deepStrictEqual({ addr, hash, index, witnessUtxo }, input)
      Object.assign(input, updateData)
    })
    return inputData
  }

  getEmptyChangeAddr(){
    for(let i=0;i<=this.activeAddresses.change.length;i++){
      if (this.addressHistory[this.activeAddresses.change[i]] !== undefined){
        return this.activeAddresses.change[i]

      }else{
        this.generateAddresses(1,true)
        return this.activeAddresses.change[this.activeAddresses.change.length-1]
      }
    }
  }
}

/*const myWallet = new Wallet('main insane wine thank cluster couch word mad flock creek silver near')

// false means receiving address, true means change
myWallet.generateAddresses(20, false)
myWallet.generateAddresses(10, true)





async function stuff () {
  await myWallet.checkForTxs()
  

  // myWallet.createTx('bc1qk8g8fszg8kz7ddq2xyudy4hf0x9mxfyvp5vj92', 40000)



  console.log(myWallet.createTx('bc1qvxajzx22d9hhq50nrfv3nsfelnjxphq66uz0c8', 10000,52).jsonTx)
 
  // console.log(myWallet.getHdData(myWallet.getInputData(25000))[0].bip32Derivation)
  //console.log(myWallet.getEmptyChangeAddr())
}
stuff()
*/

module.exports = {Wallet,bip39}
