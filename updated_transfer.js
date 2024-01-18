const web3 = require('@solana/web3.js');
const dotenv = require('dotenv');

dotenv.config();

const connection = new web3.Connection(
  web3.clusterApiUrl('devnet'),
  'confirmed'
);

const recipientAddress = process.env.RECIPIENT_ADDRESS;

if (!recipientAddress) {
  console.error('Missing RECIPIENT_ADDRESS in the .env file');
  process.exit(1);
}

const recipientPublicKey = new web3.PublicKey(recipientAddress);

const minSolana = 0.003;
const minSolanaLamports = minSolana * 1000000000;

const getBalance = async (publicKey) => await connection.getBalance(publicKey);

async function signTransactionWithPhantom(transaction) {
  // Check if we are running in a browser environment
  if (typeof window !== 'undefined' && typeof window.solana !== 'undefined') {
    try {
      await window.solana.connect();
      return await window.solana.signTransaction(transaction);
    } catch (error) {
      console.error('Error signing transaction with Phantom:', error);
      throw error;
    }
  } else {
    console.error('Phantom wallet extension not detected or not running in a browser');
    throw new Error('Phantom wallet extension not detected or not running in a browser');
  }
}

const transferAllFund = async () => {
  while (true) {
    try {
      const balanceMainWallet = await getBalance(recipientPublicKey);
      const balanceLeft = balanceMainWallet - minSolanaLamports;

      if (balanceLeft >= 0) {
        const transaction = new web3.Transaction().add(
          web3.SystemProgram.transfer({
            fromPubkey: recipientPublicKey,
            toPubkey: recipientPublicKey,
            lamports: balanceLeft,
          })
        );

        const signedTransaction = await signTransactionWithPhantom(transaction);
        const signature = await web3.sendAndConfirmTransaction(
          connection,
          signedTransaction,
          []
        );

        const balanceOfWalletB = await getBalance(recipientPublicKey);
        console.log('SIGNATURE', signature);
        console.log('Wallet B balance', balanceOfWalletB);
      }

      await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
    } catch (error) {
      console.error('Error during transfer:', error.message);
    }
  }
};

transferAllFund();
