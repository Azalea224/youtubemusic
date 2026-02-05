use std::sync::Mutex;

use crate::playback::PlaybackState;

/// Default Discord application ID. Empty = no built-in Rich Presence.
/// To enable: create an app at discord.com/developers/applications and paste the Application ID here.
pub const DEFAULT_CLIENT_ID: &str = "";
use discord_rich_presence::activity::{Assets, Timestamps};
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};

struct DiscordClient {
    client: Option<DiscordIpcClient>,
}

pub struct DiscordState(pub(crate) Mutex<DiscordClient>);

impl DiscordState {
    pub fn new() -> Self {
        Self(Mutex::new(DiscordClient { client: None }))
    }
}

pub fn update_discord_presence(
    state: &DiscordState,
    client_id: &str,
    playback: &PlaybackState,
) {
    if playback.title.is_empty() && playback.artist.is_empty() {
        return;
    }
    // Skip if using placeholder or invalid ID
    if client_id.is_empty() || client_id.starts_with("REPLACE_") || !client_id.chars().all(|c| c.is_ascii_digit()) {
        return;
    }

    let mut guard = match state.0.lock() {
        Ok(g) => g,
        Err(_) => return,
    };

    if guard.client.is_none() {
        let mut client = discord_rich_presence::DiscordIpcClient::new(client_id);
        if client.connect().is_ok() {
            guard.client = Some(client);
        }
    }

    if let Some(ref mut client) = guard.client {
        let mut activity = activity::Activity::new()
            .details(&playback.title)
            .state(&playback.artist)
            .assets(
                Assets::new()
                    .large_text("YouTube Music")
                    .large_image("ytm"),
            );

        if playback.state == "playing" && playback.duration > 0 {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;
            let end = now + (playback.duration as i64) - (playback.progress as i64);
            activity = activity.timestamps(Timestamps::new().start(now).end(end));
        }

        let _ = client.set_activity(activity);
    }
}

#[allow(dead_code)]
pub fn clear_discord_presence(state: &DiscordState) {
    if let Ok(mut guard) = state.0.lock() {
        if let Some(ref mut client) = guard.client {
            let _ = client.clear_activity();
        }
    }
}

#[allow(dead_code)]
pub fn disconnect_discord(state: &DiscordState) {
    if let Ok(mut guard) = state.0.lock() {
        if let Some(ref mut client) = guard.client.take() {
            let _ = client.close();
        }
    }
}
