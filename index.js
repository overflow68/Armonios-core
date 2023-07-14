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
      change: [],
      receiving: []
    }
    this.addressHistory = {}
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
    data.txs.forEach(tx => {
      tx.out.forEach(output => {
        if (output.addr in this.addressHistory) {
          if (!this.addressHistory[output.addr].includes(tx.hash)) {
            this.addressHistory[output.addr].push(tx.hash)
            this.addressHistory[output.addr].push(tx.block_height)
          }
        }
      })
    })
  }
}

const myWallet = new Wallet('main insane wine thank cluster couch word mad flock creek silver near')

// false means receiving address, true means change
myWallet.generateAddresses(3, false)
myWallet.generateAddresses(3, true)


async function stuff () {
  await myWallet.checkForTxs()
  console.log(myWallet)
}
stuff()
