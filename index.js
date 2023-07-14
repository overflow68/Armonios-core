const ecc = require('tiny-secp256k1')
const bip39 = require('bip39')
const { BIP32Factory } = require('bip32')
const bip32 = BIP32Factory(ecc)
const bitcoin = require('bitcoinjs-lib')

class Wallet {
  constructor (mnemonic) {
    this.mnemonic = mnemonic
    this.path = 'm/0/0'
    this.extendedPrivKey = this.getXprv(mnemonic)
    this.extendedPubKey = this.getXpub(mnemonic)
    this.active = false
    this.activeAddresses = {
        change:[],
        receiving:[]
    },
    this.addressHistory = {

    }
  }

  getXprv (mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const rootKey = bip32.fromSeed(seed)
    
    return rootKey.toBase58();
  }

  getXpub (mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const rootKey = bip32.fromSeed(seed)

    return rootKey.neutered().toBase58()
  }
  generateReceiveAddresses(quantity){
    const rootKey = bip32.fromBase58(this.extendedPrivKey)
    const startIndex = this.activeAddresses.receiving.length
    for (let i = startIndex; i < startIndex + quantity; i++) {
      const destructuredPath = this.path.split('/')
      destructuredPath[2] = i
      const finalPath = destructuredPath.join('/')

      const extendedKey = rootKey.derivePath(finalPath)
      const { address } =  bitcoin.payments.p2wpkh({ pubkey: extendedKey.publicKey })
      if (!this.activeAddresses.receiving.includes(address)) {
        this.activeAddresses.receiving.push(address)
      }
    }
    
  }
  generateChangeAddresses(quantity){
    const rootKey = bip32.fromBase58(this.extendedPrivKey)
    const startIndex = this.activeAddresses.change.length
    for (let i = startIndex; i < startIndex + quantity; i++) {
      const destructuredPath = this.path.split('/')
      destructuredPath[1] = 1
      destructuredPath[2] = i
      const finalPath = destructuredPath.join('/')

      const extendedKey = rootKey.derivePath(finalPath)
      const { address } =  bitcoin.payments.p2wpkh({ pubkey: extendedKey.publicKey })
      if (!this.activeAddresses.change.includes(address)) {
        this.activeAddresses.change.push(address)
      }
    }
  }
  //make this add addresses and their transaction hashes to address history
  async checkForTxs () {
    let api = 'https://blockchain.info/multiaddr?active='
    this.activeAddresses.receiving.forEach(address=>{
        api+=`|${address}`
    })
    this.activeAddresses.change.forEach(address=>{
        api+=`|${address}`
    })
    const response = await fetch(api)
    const data = await response.json()
    if (data.txs.length === 0) {
      console.log('Wallet is inactive')
    } else {this.active = true
    console.log(data)}
  }
  
}

const myWallet = new Wallet('main insane wine thank cluster couch word mad flock creek silver near')



myWallet.generateChangeAddresses(2)


