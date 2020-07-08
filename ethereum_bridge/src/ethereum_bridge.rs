use ellipticoin::{
    call, constants::SYSTEM_CONTRACT_ADDRESS, contract_address, export, sender, value::to_value,
    Value,
};
use wasm_rpc::serde_cbor::value;

#[export]
mod ethereum_bridge {
    pub fn constructor() {}

    pub fn burn(amount: u64, _ethereum_address: Vec<u8>) -> Result<Value, String> {
	call::<wasm_rpc::Value>(
            SYSTEM_CONTRACT_ADDRESS.to_vec(),
            "transfer_from",
            vec![
                to_value(sender()).unwrap(),
                to_value(contract_address()).unwrap(),
                amount.into(),
            ]
            .into(),
        );
	Ok(Value::Null)
    }

    pub fn burn_and_swap(amount: u64, _ethereum_address: Vec<u8>) -> Result<Value, String> {
        value::from_value(call(
            SYSTEM_CONTRACT_ADDRESS.to_vec(),
            "transfer_from",
            vec![
                to_value(sender()).unwrap(),
                to_value(contract_address()).unwrap(),
                amount.into(),
            ]
            .into(),
        ))
        .unwrap()
    }

    pub fn transfer(to: Vec<u8>, amount: u64) -> Result<(), String> {
        if !is_owner() {
            return Err("Not contract owner".to_string());
        };
        call::<Value>(
            SYSTEM_CONTRACT_ADDRESS.to_vec(),
            "transfer",
            vec![
                to.into_iter()
                    .map(|n| n.into())
                    .collect::<Vec<Value>>()
                    .into(),
                amount.into(),
            ]
            .into(),
        );
        Ok(())
    }

    fn is_owner() -> bool {
        contract_address().starts_with(&sender())
    }
}

#[cfg(test)]

mod tests {
    use super::*;
    use ellipticoin::value::to_value;
    use ellipticoin::{set_contract_address, set_mock_call, set_sender, value};
    use ellipticoin_test_framework::{ALICE, BOB};

    #[test]
    fn test_burn() {
        let ethereum_adress = hex::decode("Adfe2B5BeAc83382C047d977db1df977FD9a7e41").unwrap();
        let contract_address = [ALICE.to_vec(), "EthereumBridge".as_bytes().to_vec()].concat();
        set_contract_address(contract_address.clone());
        set_sender(ALICE.to_vec());
        set_mock_call(
            SYSTEM_CONTRACT_ADDRESS.to_vec(),
            "transfer_from",
            &|arguments| {
                let contract_address =
                    [ALICE.to_vec(), "EthereumBridge".as_bytes().to_vec()].concat();
                assert_eq!(
                    arguments.get(0).unwrap().clone(),
                    to_value(ALICE.to_vec()).unwrap()
                );
                assert_eq!(
                    arguments.get(1).unwrap().clone(),
                    to_value(contract_address.clone().to_vec()).unwrap()
                );
                value::to_value::<Result<Value, &str>>(Ok(Value::Null)).unwrap()
            },
        );
        burn(100, ethereum_adress).unwrap();
    }

    #[test]
    fn test_burn_and_swap() {
        let ethereum_adress = hex::decode("Adfe2B5BeAc83382C047d977db1df977FD9a7e41").unwrap();
        let contract_address = [ALICE.to_vec(), "EthereumBridge".as_bytes().to_vec()].concat();
        set_contract_address(contract_address.clone());
        set_sender(ALICE.to_vec());
        set_mock_call(
            SYSTEM_CONTRACT_ADDRESS.to_vec(),
            "transfer_from",
            &|arguments| {
                let contract_address =
                    [ALICE.to_vec(), "EthereumBridge".as_bytes().to_vec()].concat();
                assert_eq!(
                    arguments.get(0).unwrap().clone(),
                    to_value(ALICE.to_vec()).unwrap()
                );
                assert_eq!(
                    arguments.get(1).unwrap().clone(),
                    to_value(contract_address.clone().to_vec()).unwrap()
                );
                value::to_value::<Result<Value, &str>>(Ok(Value::Null)).unwrap()
            },
        );
        burn_and_swap(100, ethereum_adress).unwrap();
    }

    #[test]
    fn test_transfer() {
        let contract_address = [ALICE.to_vec(), "EthereumBridge".as_bytes().to_vec()].concat();
        set_contract_address(contract_address.clone());
        set_sender(ALICE.to_vec());
        set_mock_call(SYSTEM_CONTRACT_ADDRESS.to_vec(), "transfer", &|arguments| {
            let contract_address = [ALICE.to_vec(), "EthereumBridge".as_bytes().to_vec()].concat();
            assert_eq!(
                arguments.get(0).unwrap().clone(),
                to_value(BOB.to_vec()).unwrap()
            );
            assert_eq!(arguments.get(1).unwrap().clone(), to_value(100).unwrap());
            value::to_value::<Result<Value, &str>>(Ok(Value::Null)).unwrap()
        });
        transfer(BOB.to_vec(), 100).unwrap();
    }
}
