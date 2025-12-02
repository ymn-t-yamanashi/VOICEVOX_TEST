const VOICEVOX_URL = "http://localhost:50021"; // VOICEVOX EngineのURL

// 要素の取得 (グローバルスコープで定義)
const textInput = document.getElementById('text-input');
const speakerSelect = document.getElementById('speaker-select');
const speakButton = document.getElementById('speak-button');
const audioPlayer = document.getElementById('audio-player');

// --- 1. VOICEVOX API通信関数 ---

/**
 * 1. VOICEVOX APIを使って音声合成クエリを取得します (audio_query)。
 * @param {string} text - 読み上げさせるテキスト
 * @param {string} speakerId - 話者ID (stringで受け取るが、APIは内部で処理)
 * @returns {Promise<object>} 音声クエリオブジェクト
 */
async function fetchAudioQuery(text, speakerId) {
    const queryParams = new URLSearchParams({
        text: text,
        speaker: speakerId
    });
    const queryUrl = `${VOICEVOX_URL}/audio_query?${queryParams}`;

    const queryResponse = await fetch(queryUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
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
    const synthesisParams = new URLSearchParams({
        speaker: speakerId
    });
    const synthesisUrl = `${VOICEVOX_URL}/synthesis?${synthesisParams}`;

    const synthesisResponse = await fetch(synthesisUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(audioQuery)
    });

    if (!synthesisResponse.ok) {
        throw new Error(`synthesis failed with status ${synthesisResponse.status}`);
    }

    return await synthesisResponse.blob();
}

// --- 2. DOM/再生制御関数 ---

/**
 * HTMLのaudio要素を使って音声データを再生します。
 * @param {Blob} wavBlob - WAV形式の音声データBlob
 */
async function playAudioBlob(wavBlob) {
    // Blobから一時的なURLを作成し、audio要素のsrcに設定
    const audioUrl = URL.createObjectURL(wavBlob);
    audioPlayer.src = audioUrl;

    // 再生開始 (awaitでPromiseを待ち、再生ブロックエラーをキャッチできるようにする)
    await audioPlayer.play();
}


// --- 3. メインアプリケーション関数 (speakText) ---

/**
 * テキストを音声に変換して再生します
 * (index.htmlの onclick="speakText()" から呼び出されます)
 */
async function speakText() {
    const text = textInput.value.trim();
    const speakerId = speakerSelect.value;

    if (!text) {
        // alert() を使用せず、console.error() でログを出すのみ
        console.error("エラー: テキストが入力されていません。");
        return;
    }

    // UI制御: ボタンを無効化し、前の音声をクリア
    speakButton.disabled = true;
    audioPlayer.removeAttribute('src'); 

    try {
        // API通信ロジックを呼び出し
        const audioQuery = await fetchAudioQuery(text, speakerId);
        const wavBlob = await fetchSynthesis(audioQuery, speakerId);
        
        // 再生ロジックを呼び出し
        await playAudioBlob(wavBlob);

        // 再生終了イベントの設定
        audioPlayer.onended = () => {
            speakButton.disabled = false;
        };

    } catch (error) {
        // エラー詳細を console.error() で出力
        console.error("致命的なエラーが発生しました:", error.message, error);
        
        if (error.name === "NotAllowedError") {
            // 再生ブロックに関するメッセージもログに出力
            console.warn("警告: 再生がブラウザによってブロックされました。ユーザー操作が必要です。");
        } else if (error.message.includes("failed with status")) {
            // API接続エラー
            console.error(`VOICEVOX Engine 接続エラー: ポート (${VOICEVOX_URL}) を確認してください。`);
        } 
        
        // エラー発生時はボタンを有効に戻す
        speakButton.disabled = false;
    } 
}