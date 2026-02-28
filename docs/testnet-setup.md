# Testnet Wallet Setup — Sepolia

## Wallet
- **Address:** `0x3f45fE1437B409CdC964Ef4Ff8B4E2de5b05971F`
- **Network:** Ethereum Sepolia (testnet)
- **Private Key:** En `.secrets/.env` → `SEPOLIA_PRIVATE_KEY` (NUNCA compartir)

## Fondeo (2026-02-28)

**Faucet usado:** Google Cloud Web3 Sepolia Faucet
- URL: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- Monto: 0.05 Sepolia ETH
- Transaction hash: `0xb3e515c834289fb21dca389151ba6e00318637f091a0ab0b4aee024434565126`
- Screenshot: [sepolia-faucet-funded.jpg](./sepolia-faucet-funded.jpg)

### Faucets alternativos probados
| Faucet | Status | Notas |
|--------|--------|-------|
| Google Cloud Web3 | ✅ Funcionó | 0.05 ETH, sin requisitos |
| Alchemy | ❌ Requiere 0.001 ETH mainnet | Anti-spam, wallet vacía no pasa |
| sepoliafaucet.com | No probado | Alternativa backup |

## Notas
- Sepolia ETH no tiene valor real — es solo para testing
- El faucet de Google permite 1 drip por día
- 0.05 ETH es suficiente para cientos de transacciones de prueba
