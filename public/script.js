const grid = document.getElementById('grid');
const totalBalance = document.getElementById('totalBalance');
const statusIndicator = document.getElementById('statusIndicator');
const loadingIndicator = document.getElementById('loadingIndicator');
const addressesContainer = document.getElementById('addresses');
const secretKeyInput = document.getElementById('secretKey');

let secretKey = '0'.repeat(64); // Изначально все символы равны 0

// Создаём сетку 16x4 (64 ячейки)
for (let i = 0; i < 64; i++) {
    const square = document.createElement('div');
    square.classList.add('square');
    square.textContent = '0';
    square.addEventListener('click', () => {
        const currentChar = square.textContent;
        const newChar = getNextHexChar(currentChar);
        square.textContent = newChar;
        secretKey = updateSecretKey(secretKey, i, newChar);
        secretKeyInput.value = secretKey;
        fetchAddressesAndBalances(secretKey);
    });
    grid.appendChild(square);
}

// Получаем следующий hex-символ
function getNextHexChar(currentChar) {
    const hexChars = '0123456789ABCDEF';
    const currentIndex = hexChars.indexOf(currentChar);
    return hexChars[(currentIndex + 1) % hexChars.length];
}

// Обновляем приватный ключ при клике на квадрат
function updateSecretKey(secretKey, index, newChar) {
    return secretKey.substring(0, index) + newChar + secretKey.substring(index + 1);
}

// Редактор ключа
secretKeyInput.addEventListener('input', (e) => {
    const value = e.target.value.toUpperCase();
    if (value.length === 64 && /^[0-9A-F]+$/.test(value)) {
        secretKey = value;
        updateGridFromKey(secretKey);
        fetchAddressesAndBalances(secretKey);
    }
});

// Обновляем сетку по ключу
function updateGridFromKey(secretKey) {
    const squares = document.querySelectorAll('.square');
    squares.forEach((square, index) => {
        square.textContent = secretKey[index];
    });
}

// Запрос к серверу для получения адресов и балансов
async function fetchAddressesAndBalances(secretKey) {
    loadingIndicator.style.display = 'block';
    addressesContainer.innerHTML = '';

    try {
        const response = await fetch('/get-addresses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ secretKey }),
        });

        const data = await response.json();

        if (data.error) {
            console.error(data.error);
            return;
        }

        displayAddressesAndBalances(data.addresses, data.publicKey);
    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// Отображение адресов и балансов
function displayAddressesAndBalances(addresses, publicKey) {
    let total = 0;
    addressesContainer.innerHTML = '';

    for (const [walletType, data] of Object.entries(addresses)) {
        const mainnetBalance = parseFloat(data.mainnet.balance);
        const testnetBalance = parseFloat(data.testnet.balance);
        total += mainnetBalance + testnetBalance;

        const addressDiv = document.createElement('div');
        addressDiv.classList.add('address');
        addressDiv.innerHTML = `
            <h3>${walletType}</h3>
            <p>Mainnet: ${data.mainnet.address} (${data.mainnet.balance} TON)</p>
            <p>Testnet: ${data.testnet.address} (${data.testnet.balance} TON)</p>
        `;
        addressesContainer.appendChild(addressDiv);
    }

    totalBalance.textContent = `Суммарный баланс: ${total.toFixed(2)} TON`;
    statusIndicator.className = total > 0 ? 'status green' : 'status red';
    statusIndicator.textContent = total > 0 ? '✅' : '❌';
}
