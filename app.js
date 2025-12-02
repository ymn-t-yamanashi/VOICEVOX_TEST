const VOICEVOX_URL = "http://localhost:50021"; // VOICEVOX EngineのURL

// 要素の取得 (UI制御に必要な要素のみ)
// speakButton の制御は不要になったため、グローバルでの取得も不要になりますが、
// index.htmlのonclickでspeakText関数が呼び出されるため、ここではaudioPlayerのみ残します。
const audioPlayer = document.getElementById('audio-player');

// --- 1. VOICEVOX API通信関数 (変更なし) ---

/**
 * 1. VOICEVOX APIを使って音声合成クエリを取得します (audio_query)。
 * @param {string} text - 読み上げさせるテキスト
 * @param {string} speakerId - 話者ID 
 * @returns {Promise<object>} 音声クエリオブジェクト
 */
async function fetchAudioQuery(text, speakerId) {
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
 * @param {object} audioQuery - fetchAudioQueryで取得した音声クエリオブジェクト
 * @param {string} speakerId - 話者ID
 * @returns {Promise<Blob>} WAV形式の音声データBlob
 */
async function fetchSynthesis(audioQuery, speakerId) {
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


// --- 2. コアロジック関数 (変更なし) ---

/**
 * VOICEVOX APIを使って音声データ(Blob)を取得する純粋なロジック関数。
 */
async function synthesizeTextToBlob(text, speakerId) {
    const trimmedText = text.trim();
    if (!trimmedText) {
        throw new Error("Text input is empty."); 
    }

    // 1. クエリ取得
    const audioQuery = await fetchAudioQuery(trimmedText, speakerId);
    
    // 2. 音声合成
    const wavBlob = await fetchSynthesis(audioQuery, speakerId);

    return wavBlob;
}


// --- 3. メインアプリケーション関数 ---

/**
 * ページからの onclick で呼び出されるエントリーポイント。
 */
async function speakText(text, speakerId) {
    // 🌟 speakButtonの制御を削除 🌟
    // speakButton.disabled = true; <-- 削除
    audioPlayer.removeAttribute('src'); 

    try {
        // コアロジックを呼び出し、Blobを取得
        const wavBlob = await synthesizeTextToBlob(text, speakerId);
        
        // 再生ロジック（UI依存）
        const audioUrl = URL.createObjectURL(wavBlob);
        audioPlayer.src = audioUrl;
        
        // 前の再生を中断し、新しい再生を開始
        await audioPlayer.play();

        // 🌟 再生終了イベントの設定を削除 🌟
        // audioPlayer.onended = () => { speakButton.disabled = false; }; <-- 削除

    } catch (error) {
        // エラー詳細を console.error() で出力 
        console.error("致命的なエラーが発生しました:", error.message, error);
        
        if (error.message.includes("Text input is empty")) {
            console.error("エラー: テキストが入力されていません。");
        } else if (error.name === "NotAllowedError") {
            console.warn("警告: 再生がブラウザによってブロックされました。");
        } else {
            console.error(`VOICEVOX Engine 接続エラー: ポート (${VOICEVOX_URL}) を確認してください。`);
        } 
        
        // 🌟 エラー発生時のボタン有効化処理を削除 🌟
        // speakButton.disabled = false; <-- 削除
    } 
}