#![allow(dead_code)]
extern crate lru;
extern crate nix;
extern crate openssl;
extern crate reqwest;
extern crate smartstring;
extern crate tokio;

use std::net::SocketAddr;
use std::str;
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex};
use structopt::StructOpt;
use tokio::net::UdpSocket;

mod cache;
mod cli;
mod config;
mod dns_actors;
mod filter;
mod filter_statistics;
mod helpers;
mod instrumentation;
mod message;
mod network;
mod question;
mod resolver_manager;
mod resource_record;
mod ring_buffer;
mod tree;
mod web;
mod web_auth;
use crate::cache::*;
use crate::cli::*;
use crate::config::Config;
use crate::dns_actors::*;
use crate::filter::*;
use crate::instrumentation::*;
use crate::message::*;
use crate::resolver_manager::ResolverManager;
use crate::web::*;

const DEFAULT_INTERNAL_ADDRESS: &str = "127.0.0.1:53";
const DEFAULT_EXTERNAL_ADDRESS: &str = "0.0.0.0:53";
const DEFAULT_INTERNAL_ADDRESS_DEBUG: &str = "127.0.0.1:5553";

#[tokio::main]
async fn main() {
    let config = Config::from_opt(Opt::from_args());
    let verbosity = config.verbosity;

    let filter = Arc::new(Mutex::new(Filter::from_config(&config)));
    let cache = Arc::new(Mutex::new(Cache::new()));
    let instrumentation_log = Arc::new(Mutex::new(InstrumentationLog::new()));
    let resolver_manager = Arc::new(Mutex::new(ResolverManager::new()));

    let socket = UdpSocket::bind(if config.debug {
        DEFAULT_INTERNAL_ADDRESS_DEBUG
    } else if config.external {
        DEFAULT_EXTERNAL_ADDRESS
    } else {
        DEFAULT_INTERNAL_ADDRESS
    })
    .await
    .expect("tried to bind an UDP port");
    let (receiving, sending) = socket.split();
    // TODO: Considere using https://docs.rs/async-std/1.3.0/async_std/sync/fn.channel.html
    let (response_sender, response_receiver) = channel::<(SocketAddr, Instrumentation, Message)>();

    spawn_responder(
        sending,
        response_receiver,
        Arc::clone(&instrumentation_log),
        Arc::clone(&resolver_manager),
        verbosity,
    );
    spawn_listener(
        receiving,
        response_sender,
        Arc::clone(&filter),
        Arc::clone(&cache),
        Arc::clone(&resolver_manager),
        verbosity,
    );
    start_web(config, filter, cache, instrumentation_log).await.unwrap();
}
