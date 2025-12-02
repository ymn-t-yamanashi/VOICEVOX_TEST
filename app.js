const VOICEVOX_URL = "http://localhost:50021"; // VOICEVOX EngineのURL

// 要素の取得 (speakTextの呼び出し元でのみ使用)
const textInput = document.getElementById('text-input');
const speakerSelect = document.getElementById('speaker-select');
const speakButton = document.getElementById('speak-button');
const audioPlayer = document.getElementById('audio-player');

// --- 1. VOICEVOX API通信関数 (変更なし) ---

/**
 * 1. VOICEVOX APIを使って音声合成クエリを取得します (audio_query)。
 */
async function fetchAudioQuery(text, speakerId) {
    // ... (中身は前回の app.js と同じ)
    const queryParams = new URLSearchParams({ text: text, speaker: speakerId });
    const queryUrl = `${VOICEVOX_URL}/audio_query?${queryParams}`;

    const queryResponse = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!queryResponse.ok) {
        throw new Error(`audio_query failed with status ${queryResponse.status}`);
    }
    return await queryResponse.json();
}

/**
 * 2. VOICEVOX APIを使って音声合成を実行し、WAV形式のBlobを取得します (synthesis)。
 */
async function fetchSynthesis(audioQuery, speakerId) {
    // ... (中身は前回の app.js と同じ)
    const synthesisParams = new URLSearchParams({ speaker: speakerId });
    const synthesisUrl = `${VOICEVOX_URL}/synthesis?${synthesisParams}`;

    const synthesisResponse = await fetch(synthesisUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audioQuery)
    });

    if (!synthesisResponse.ok) {
        throw new Error(`synthesis failed with status ${synthesisResponse.status}`);
    }
    return await synthesisResponse.blob();
}


// --- 2. コアロジック関数 (UI依存性を排除) ---

/**
 * VOICEVOX APIを使って音声データ(Blob)を取得する純粋なロジック関数。
 * 🌟 UIや再生処理のコードは一切含まない 🌟
 * @param {string} text - 読み上げさせるテキスト
 * @param {string} speakerId - 話者ID 
 * @returns {Promise<Blob>} WAV形式の音声データBlob
 */
async function synthesizeTextToBlob(text, speakerId) {
    const trimmedText = text.trim();
    if (!trimmedText) {
        // UI制御（エラー表示）は呼び出し元に任せるため、ここではエラーを投げる
        throw new Error("Text input is empty."); 
    }

    // 1. クエリ取得
    const audioQuery = await fetchAudioQuery(trimmedText, speakerId);
    
    // 2. 音声合成
    const wavBlob = await fetchSynthesis(audioQuery, speakerId);

    return wavBlob;
}


// --- 3. メインアプリケーション関数 (UI制御とコアロジックの結合) ---

/**
 * ページからの onclick で呼び出されるエントリーポイント。
 * UI制御とエラーハンドリングを担当します。
 */
async function speakText(text, speakerId) {
    // UI制御: ボタンを無効化し、前の音声をクリア
    speakButton.disabled = true;
    audioPlayer.removeAttribute('src'); 

    try {
        // コアロジックを呼び出し、Blobを取得
        const wavBlob = await synthesizeTextToBlob(text, speakerId);
        
        // 再生ロジック（UI依存）
        const audioUrl = URL.createObjectURL(wavBlob);
        audioPlayer.src = audioUrl;
        await audioPlayer.play();

        // 再生終了イベントの設定
        audioPlayer.onended = () => {
            speakButton.disabled = false;
        };

    } catch (error) {
        // エラー詳細を console.error() で出力し、UIを元に戻す
        console.error("致命的なエラーが発生しました:", error.message, error);
        
        if (error.message.includes("Text input is empty")) {
            console.error("エラー: テキストが入力されていません。");
        } else if (error.name === "NotAllowedError") {
            console.warn("警告: 再生がブラウザによってブロックされました。");
        } else {
            console.error(`VOICEVOX Engine 接続エラー: ポート (${VOICEVOX_URL}) を確認してください。`);
        } 
        
        // エラー発生時はボタンを有効に戻す
        speakButton.disabled = false;
    } 
}