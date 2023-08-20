#Armonios-core Documentation

Armonios-core is a JavaScript class that enables the management of a Bitcoin wallet, including key generation, address creation, transaction creation, and interaction with the Bitcoin blockchain.

## Prerequisites

Make sure you have the following libraries installed:

- `@bitcoinerlab/secp256k1`: Library for elliptic curve cryptography operations.
- `bip39`: Library for generating and working with BIP39 mnemonic phrases.
- `bip32`: Library for generating and working with BIP32 hierarchical deterministic keys.
- `ecpair`: Library for generating elliptic curve key pairs.
- `bitcoinjs-lib`: Library for Bitcoin transaction and address generation.
- `assert`: Built-in Node.js module for assertions.

## Class: Wallet

### Constructor

#### Parameters

- `mnemonic` (string): A BIP39 mnemonic phrase used to generate the wallet's root keys.

#### Properties

- `mnemonic` (string): The BIP39 mnemonic phrase associated with the wallet.
- `path` (string): The BIP32 derivation path used for key generation (default: `'m/0/0'`).
- `extendedPrivKey` (string): The extended private key derived from the provided mnemonic.
- `extendedPubKey` (string): The extended public key derived from the provided mnemonic.
- `active` (boolean): Indicates whether the wallet is active (has transactions).
- `activeAddresses` (object): Contains arrays of active change and receiving addresses.
- `addressHistory` (object): Keeps track of transaction history for each address.
- `unspentCoins` (array): Stores unspent transaction outputs (UTXOs).
- `txHistory` (array): Stores the transaction history.

### Methods

#### `getXprv(mnemonic)`

Generates and returns the extended private key (xprv) derived from the provided mnemonic.

#### `getXpub(mnemonic)`

Generates and returns the extended public key (xpub) derived from the provided mnemonic.

#### `generateAddresses(quantity, isChange)`

Generates Bitcoin addresses based on the provided quantity and type (change or receiving). The generated addresses are stored in `activeAddresses` and `addressHistory`.

#### `checkForTxs()`

Queries the blockchain for transactions involving the wallet's addresses. Updates `active` status, `txHistory`, `addressHistory`, and `unspentCoins`.

#### `getTxFee(hdRoot, inputs, receiver, value)`

Builds a transaction, calculates its fee, and returns the transaction's size in virtual bytes (vbytes).

#### `createTx(receiver, value, feeRate)`

Creates a Bitcoin transaction using specified parameters: recipient, value, and fee rate. Returns the raw transaction and a JSON representation of the transaction.

#### `getInputData(amount)`

Selects and returns a list of inputs for a transaction based on the specified amount.

#### `getWitnessUtxo(out)`

Formats a UTXO for use in the `bitcoinjs-lib` library.

#### `getHdData(inputData)`

Generates the necessary BIP32 derivation data for each input's holding address.

#### `getEmptyChangeAddr()`

Finds or generates a change address that can be used for receiving change from transactions.

## Conclusion

Armonios-core provides functionalities for mnemonic-based key generation, address creation, transaction creation, and interaction with the Bitcoin blockchain. Users can create transactions, estimate fees, and manage their Bitcoin wallet using this logic.

checkForTxs()
Queries the blockchain for transactions involving the wallet's addresses. Updates active status, txHistory, addressHistory, and unspentCoins.

getTxFee(hdRoot, inputs, receiver, value)
Builds a transaction, calculates its fee, and returns the transaction's size in virtual bytes (vbytes).

createTx(receiver, value, feeRate)
Creates a Bitcoin transaction using specified parameters: recipient, value, and fee rate. Returns the raw transaction and a JSON representation of the transaction.

getInputData(amount)
Selects and returns a list of inputs for a transaction based on the specified amount.

getWitnessUtxo(out)
Formats a UTXO for use in the bitcoinjs-lib library.

getHdData(inputData)
Generates the necessary BIP32 derivation data for each input's holding address.

getEmptyChangeAddr()
Finds or generates a change address that can be used for receiving change from transactions.

Conclusion
The provided Bitcoin wallet logic class offers functionalities for mnemonic-based key generation, address generation, transaction creation, and interaction with the Bitcoin blockchain. Users can create transactions, estimate fees, and manage their Bitcoin wallet using this class. Make sure to use the appropriate libraries and dependencies to ensure the correct behavior of the wallet.
