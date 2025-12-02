const VOICEVOX_URL = "http://localhost:50021"; // VOICEVOX EngineのURL

// 要素の取得 (audioPlayerは不要になったため削除)

// --- 1. VOICEVOX API通信関数 (変更なし) ---

/**
 * 1. VOICEVOX APIを使って音声合成クエリを取得します (audio_query)。
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


// --- 3. メインアプリケーション関数 (動的要素生成を追加) ---

/**
 * ページからの onclick で呼び出されるエントリーポイント。
 */
async function speakText(text, speakerId) {
    // 🌟 audioPlayerは動的に生成するため、ここで取得は不要 🌟

    try {
        // 1. コアロジックを呼び出し、Blobを取得
        const wavBlob = await synthesizeTextToBlob(text, speakerId);
        
        // 2. 🌟 JavaScript側で <audio> 要素を生成 🌟
        const audioPlayer = new Audio(); // HTML5 Audio要素のインスタンスを作成
        audioPlayer.style.display = 'none'; // 非表示のままにする (前回の要件を維持)

        // 3. 再生ロジック
        const audioUrl = URL.createObjectURL(wavBlob);
        audioPlayer.src = audioUrl;
        
        // 4. 再生開始
        await audioPlayer.play();

        // 5. 再生終了後のクリーンアップ
        audioPlayer.onended = () => {
            // メモリを解放するため、URLオブジェクトを解放し、要素の参照を不要にする
            URL.revokeObjectURL(audioUrl);
            // （ここでは要素をDOMに追加していないため、DOMからの削除は不要）
        };
        // エラー時もURLを解放
        audioPlayer.onerror = () => {
             URL.revokeObjectURL(audioUrl);
        };


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
    } 
}