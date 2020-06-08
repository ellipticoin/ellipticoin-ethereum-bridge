#[cfg(not(test))]
extern crate ellipticoin;
#[cfg(test)]
extern crate mock_ellipticoin as ellipticoin;

extern crate wasm_rpc;
extern crate wasm_rpc_macros;

#[cfg(test)]
extern crate ellipticoin_test_framework;

pub mod ethereum_bridge;
