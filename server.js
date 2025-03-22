const express = require('express');
const TonWeb = require('tonweb');
const utils = TonWeb.utils;
const cors = require('cors');
const nacl = require('tweetnacl');

const app = express();
const port = 3000;

// API-ключи для mainnet и testnet
const MAINNET_API_KEY = '654544da2.........';
const TESTNET_API_KEY = '287181e87.........';

// Инициализация TonWeb для mainnet и testnet
const mainnetProvider = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
    apiKey: MAINNET_API_KEY,
});
const testnetProvider = new TonWeb.HttpProvider('https://testnet.toncenter.com/api/v2/jsonRPC', {
    apiKey: TESTNET_API_KEY,
});

const tonwebMainnet = new TonWeb(mainnetProvider);
const tonwebTestnet = new TonWeb(testnetProvider);

// Все версии кошельков
const wallets = {
    'v3R1': tonwebMainnet.wallet.all['v3R1'],
    'v3R2': tonwebMainnet.wallet.all['v3R2'],
    'v4R1': tonwebMainnet.wallet.all['v4R1'],
    'v4R2': tonwebMainnet.wallet.all['v4R2'],
};

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Папка для статических файлов (HTML, CSS, JS)

// Функция для получения баланса
async function getBalance(provider, address) {
    try {
        const balance = await provider.getBalance(address);
        return utils.fromNano(balance); // Конвертируем в TON
    } catch (error) {
        console.error('Ошибка при получении баланса:', error.message);
        return '0'; // Возвращаем 0 в случае ошибки
    }
}

// API для генерации адресов и получения балансов
app.post('/get-addresses', async (req, res) => {
    const { secretKey } = req.body;

    if (!secretKey || secretKey.length !== 64) {
        return res.status(400).json({ error: 'Приватный ключ должен быть 64 символа (32 байта).' });
    }

    // Преобразуем hex-строку в байты
    const seedBytes = utils.hexToBytes(secretKey);

    // Генерируем ключи из seed
    const keyPair = nacl.sign.keyPair.fromSeed(seedBytes);

    const addresses = {};

    for (const [walletType, WalletClass] of Object.entries(wallets)) {
        const walletMainnet = new WalletClass(mainnetProvider, {
            publicKey: keyPair.publicKey,
            wc: 0,
        });

        const walletTestnet = new WalletClass(testnetProvider, {
            publicKey: keyPair.publicKey,
            wc: 0,
        });

        const addressMainnet = (await walletMainnet.getAddress()).toString(true, true, true);
        const addressTestnet = (await walletTestnet.getAddress()).toString(true, true, true);

        const balanceMainnet = await getBalance(mainnetProvider, addressMainnet);
        const balanceTestnet = await getBalance(testnetProvider, addressTestnet);

        addresses[walletType] = {
            mainnet: { address: addressMainnet, balance: balanceMainnet },
            testnet: { address: addressTestnet, balance: balanceTestnet },
        };
    }

    res.json({ addresses, publicKey: utils.bytesToHex(keyPair.publicKey) });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
