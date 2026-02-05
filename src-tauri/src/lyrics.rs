//! Lyrics fetch proxy - bypasses CORS by fetching from Rust backend

use serde::Deserialize;

#[derive(Deserialize)]
pub struct FetchLyricsArgs {
    pub source: String,
    pub title: String,
    pub artist: String,
    #[serde(default)]
    pub duration: u64,
}

async fn fetch_lrclib(title: &str, artist: &str, duration: u64) -> Result<Option<String>, String> {
    let client = reqwest::Client::builder()
        .user_agent("YouTube-Music-Client/1.0")
        .build()
        .map_err(|e| e.to_string())?;
    let params = [
        ("track_name", title),
        ("artist_name", artist),
        ("album_name", ""),
        ("duration", &duration.to_string()),
    ];
    let res = client
        .get("https://lrclib.net/api/get")
        .query(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Ok(None);
    }
    let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let lyrics = data
        .get("plainLyrics")
        .or(data.get("syncedLyrics"))
        .and_then(|v| v.as_str())
        .map(String::from);
    Ok(lyrics)
}

async fn fetch_lyrics_ovh(title: &str, artist: &str) -> Result<Option<String>, String> {
    let client = reqwest::Client::builder()
        .user_agent("YouTube-Music-Client/1.0")
        .build()
        .map_err(|e| e.to_string())?;
    let artist_enc = urlencoding::encode(artist);
    let title_enc = urlencoding::encode(title);
    let url = format!("https://api.lyrics.ovh/v1/{}/{}", artist_enc, title_enc);
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Ok(None);
    }
    let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let lyrics = data.get("lyrics").and_then(|v| v.as_str()).map(String::from);
    Ok(lyrics)
}

async fn fetch_genius(title: &str, artist: &str) -> Result<Option<String>, String> {
    let client = reqwest::Client::builder()
        .user_agent("YouTube-Music-Client/1.0")
        .build()
        .map_err(|e| e.to_string())?;
    let query = if artist.is_empty() {
        title.to_string()
    } else {
        format!("{} {}", artist, title)
    };
    let query_enc = urlencoding::encode(&query);
    let search_url = format!("https://api.genius.com/search?q={}", query_enc);
    let res = client
        .get(&search_url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Ok(None);
    }
    let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let hit = data
        .get("response")
        .and_then(|r| r.get("hits"))
        .and_then(|h| h.as_array())
        .and_then(|a| a.first());
    let api_path = hit
        .and_then(|h| h.get("result"))
        .and_then(|r| r.get("api_path"))
        .and_then(|p| p.as_str())
        .ok_or_else(|| "No Genius hit".to_string())?;
    let page_url = format!("https://api.genius.com{}", api_path);
    let page_res = client
        .get(&page_url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !page_res.status().is_success() {
        return Ok(None);
    }
    let page_data: serde_json::Value = page_res.json().await.map_err(|e| e.to_string())?;
    let song_url = page_data
        .get("response")
        .and_then(|r| r.get("song"))
        .and_then(|s| s.get("url"))
        .and_then(|u| u.as_str())
        .ok_or_else(|| "No song URL".to_string())?;
    let html_res = client
        .get(song_url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let html = html_res.text().await.map_err(|e| e.to_string())?;
    let re = regex::Regex::new(r"<div[^>]*data-lyrics-container[^>]*>([\s\S]*?)</div>")
        .map_err(|e| e.to_string())?;
    let lyrics = re
        .captures(&html)
        .and_then(|c| c.get(1))
        .map(|m| {
            let s = m.as_str();
            let s = s.replace("<br/>", "\n").replace("<br>", "\n").replace("<br />", "\n");
            regex::Regex::new("<[^>]+>")
                .unwrap()
                .replace_all(&s, "")
                .trim()
                .to_string()
        });
    Ok(lyrics)
}

#[tauri::command]
pub async fn fetch_lyrics(args: FetchLyricsArgs) -> Result<Option<String>, String> {
    match args.source.as_str() {
        "lrclib" => fetch_lrclib(&args.title, &args.artist, args.duration).await,
        "lyricsovh" => fetch_lyrics_ovh(&args.title, &args.artist).await,
        "genius" => fetch_genius(&args.title, &args.artist).await,
        _ => Ok(None),
    }
}
