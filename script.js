document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const micButton = document.getElementById('mic-button');
    const voiceSelect = document.getElementById('voice-select');
    const statusIndicator = document.getElementById('status-indicator');
    const debugTranscriptArea = document.getElementById('debug-transcript');

    let recognition;
    const speechSynthesis = window.speechSynthesis;
    let voices = [];
    let isListening = false;
    let assistantIsSpeaking = false;
    let silenceTimer;
    const SILENCE_DELAY_MS = 1500; // Tempo de silêncio para considerar fim da fala
    let currentTranscript = '';

    function updateStatus(text, className) {
        statusIndicator.textContent = text;
        statusIndicator.className = 'status-indicator'; // Reset classes
        if (className) {
            statusIndicator.classList.add(className);
        }
    }

    function populateVoiceList() {
        voices = speechSynthesis.getVoices().sort((a, b) => {
            const aName = a.name.toUpperCase();
            const bName = b.name.toUpperCase();
            if (aName < bName) return -1;
            if (aName > bName) return 1;
            return 0;
        });

        const previouslySelected = voiceSelect.value || localStorage.getItem('selectedVoiceName');
        voiceSelect.innerHTML = '';

        voices.forEach(voice => {
            if (voice.lang.startsWith('pt')) { // Prioritizar Português
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.setAttribute('data-lang', voice.lang);
                option.setAttribute('data-name', voice.name);
                option.value = voice.name;
                voiceSelect.appendChild(option);
            }
        });

        // Adicionar outras vozes se não houver muitas em PT
        if (voiceSelect.options.length < 5) {
            voices.forEach(voice => {
                if (!voice.lang.startsWith('pt')) {
                    const option = document.createElement('option');
                    option.textContent = `${voice.name} (${voice.lang})`;
                    option.setAttribute('data-lang', voice.lang);
                    option.setAttribute('data-name', voice.name);
                    option.value = voice.name;
                    voiceSelect.appendChild(option);
                }
            });
        }
        if (previouslySelected) {
            voiceSelect.value = previouslySelected;
        }
        if(!voiceSelect.value && voiceSelect.options.length > 0) {
            voiceSelect.value = voiceSelect.options[0].value;
        }
    }

    populateVoiceList();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    voiceSelect.addEventListener('change', () => {
        localStorage.setItem('selectedVoiceName', voiceSelect.value);
    });


    function speak(text, onEndCallback) {
        if (assistantIsSpeaking) { // Evitar sobreposição
            speechSynthesis.cancel(); 
        }
        assistantIsSpeaking = true;
        updateStatus('Falando...', 'speaking');
        if (isListening && recognition) { // Pausar reconhecimento enquanto fala
            recognition.stop();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoiceName = voiceSelect.value;
        const selectedVoice = voices.find(voice => voice.name === selectedVoiceName);

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
        } else {
            utterance.lang = 'pt-BR'; // Fallback
        }
        
        utterance.onstart = () => {
            console.log('Assistente começou a falar.');
        };

        utterance.onend = () => {
            console.log('Assistente terminou de falar.');
            assistantIsSpeaking = false;
            updateStatus(isListening ? 'Ouvindo...' : 'Online', isListening ? 'listening' : 'online');
            if (isListening && recognition) { // Retomar reconhecimento se ainda estiver no modo de escuta
                try { recognition.start(); } catch(e) { console.warn("Não foi possível reiniciar o reconhecimento:", e); }
            }
            if (onEndCallback) onEndCallback();
        };
        
        utterance.onerror = (event) => {
            console.error('Erro na síntese de voz:', event);
            assistantIsSpeaking = false;
            updateStatus('Erro na voz', 'offline');
             if (isListening && recognition) { // Tentar retomar mesmo em erro
                try { recognition.start(); } catch(e) { console.warn("Não foi possível reiniciar o reconhecimento após erro de TTS:", e); }
            }
        };
        speechSynthesis.speak(utterance);
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true; // Mantém o microfone ativo
        recognition.interimResults = true; // Permite capturar resultados parciais
        recognition.lang = 'pt-BR';

        recognition.onstart = () => {
            console.log('Reconhecimento de voz iniciado.');
            isListening = true;
            micButton.textContent = '🔴 Parar Microfone';
            micButton.classList.add('recording');
            updateStatus('Ouvindo...', 'listening');
            currentTranscript = ''; // Limpa transcrição anterior
            debugTranscriptArea.value = '';
        };

        recognition.onresult = (event) => {
            clearTimeout(silenceTimer); // Cancela o timer de silêncio se houver nova fala

            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            currentTranscript = finalTranscript || interimTranscript; // Prioriza final, mas usa interim
            debugTranscriptArea.value = `Interim: ${interimTranscript}\nFinal: ${finalTranscript}\n(CurrentInternal: ${currentTranscript})`;


            // Se o assistente estiver falando e o usuário começar a falar (detectado por interim results)
            if (assistantIsSpeaking && interimTranscript.trim().length > 0) {
                console.log("Usuário interrompeu o assistente.");
                speechSynthesis.cancel(); // Para a fala do assistente
                assistantIsSpeaking = false;
                updateStatus('Ouvindo...', 'listening'); // Volta para o estado de escuta
            }

            if (finalTranscript.trim()) {
                processUserQuery(finalTranscript.trim());
                currentTranscript = ''; // Limpa para a próxima frase completa
            } else {
                // Reinicia o timer de silêncio se houver resultado provisório
                 silenceTimer = setTimeout(() => {
                    if (currentTranscript.trim() && !assistantIsSpeaking) { // Verifica se há algo no currentTranscript e se o assistente não está falando
                         console.log("Fim da fala detectado por silêncio com: ", currentTranscript.trim());
                         processUserQuery(currentTranscript.trim());
                         currentTranscript = ''; // Limpa após processar
                    }
                }, SILENCE_DELAY_MS);
            }
        };

        recognition.onerror = (event) => {
            console.error('Erro no reconhecimento de voz:', event.error);
            let errorMsg = 'Erro no reconhecimento.';
            if (event.error === 'no-speech') errorMsg = 'Nenhuma fala detectada.';
            if (event.error === 'audio-capture') errorMsg = 'Problema com microfone.';
            if (event.error === 'not-allowed') errorMsg = 'Permissão de microfone negada.';
            
            addMessage(errorMsg, 'assistant');
            speak(errorMsg);
            stopListening();
        };

        recognition.onend = () => {
            console.log('Reconhecimento de voz terminado.');
            // Não muda o estado isListening aqui se foi o assistente que parou para falar
            // O estado é controlado pelo botão ou erro.
            // Se o recognition.stop() foi chamado manualmente (pelo botão ou erro), então isListening será false.
            if (!isListening) {
                 micButton.textContent = '🎤 Iniciar Microfone';
                 micButton.classList.remove('recording');
                 updateStatus('Online', 'online');
            } else if (!assistantIsSpeaking) {
                // Se ainda deveria estar ouvindo (e não é o assistente falando), tenta reiniciar
                // Isso pode acontecer se a conexão cair brevemente.
                 try {
                    if(isListening) recognition.start();
                 } catch(e) {
                    console.warn("Reinício automático do reconhecimento falhou. Pode ser necessário clicar no botão.", e);
                    stopListening(); // Força parada se não conseguir reiniciar
                 }
            }
        };

    } else {
        micButton.disabled = true;
        micButton.textContent = 'Voz não suportada';
        addMessage('Seu navegador não suporta reconhecimento de voz.', 'assistant');
        updateStatus('Voz não suportada', 'offline');
    }
    
    function startListening() {
        if (!recognition) return;
        if (assistantIsSpeaking) speechSynthesis.cancel(); // Para o assistente se estiver falando
        
        // Solicitar permissão de microfone explicitamente se necessário
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Permissão concedida
                stream.getTracks().forEach(track => track.stop()); // Liberar o stream, o recognition cuidará disso
                isListening = true; // Seta antes de chamar start()
                try {
                    recognition.start();
                } catch(e) {
                    console.error("Erro ao iniciar reconhecimento:", e);
                    isListening = false; // Reverte se falhar
                }
            })
            .catch(err => {
                console.error('Permissão de microfone negada ou erro:', err);
                addMessage('Permissão de microfone necessária para continuar.', 'assistant');
                speak('Para conversarmos, preciso da sua permissão para usar o microfone.');
                updateStatus('Permissão negada', 'offline');
                isListening = false; // Garante que está false
                micButton.textContent = '🎤 Iniciar Microfone';
                micButton.classList.remove('recording');
            });
    }

    function stopListening() {
        if (!recognition) return;
        isListening = false; // Seta antes de chamar stop()
        clearTimeout(silenceTimer);
        try {
            recognition.stop();
        } catch(e) {
            console.warn("Erro ao parar reconhecimento (pode já estar parado):", e);
        }
        micButton.textContent = '🎤 Iniciar Microfone';
        micButton.classList.remove('recording');
        updateStatus('Online', 'online');
    }

    micButton.addEventListener('click', () => {
        if (!recognition) return;
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    });

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        messageDiv.textContent = text;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function processUserQuery(queryText) {
        if (!queryText) return;
        addMessage(queryText, 'user');
        currentTranscript = ''; // Limpa após adicionar a mensagem
        debugTranscriptArea.value = ''; // Limpa debug também

        // Lógica de resposta placeholder
        let response = "Desculpe, não entendi bem. Pode repetir ou perguntar sobre tecnologia?";
        const lowerQuery = queryText.toLowerCase();

        if (lowerQuery.includes("olá") || lowerQuery.includes("oi")) {
            response = "Olá! Como posso te ajudar com tecnologia hoje?";
        } else if (lowerQuery.includes("tudo bem") || lowerQuery.includes("como vai")) {
            response = "Estou funcionando perfeitamente! Pronto para falar sobre tecnologia.";
        } else if (lowerQuery.includes("inteligência artificial") || lowerQuery.includes("ia")) {
            response = "Inteligência Artificial é um campo fascinante! O que especificamente te interessa em IA?";
        } else if (lowerQuery.includes("programação") || lowerQuery.includes("código")) {
            response = "Programação é a arte de dar instruções a um computador. Qual linguagem ou conceito você gostaria de discutir?";
        } else if (lowerQuery.includes("adeus") || lowerQuery.includes("tchau")) {
            response = "Até logo! Se precisar de mais alguma coisa sobre tecnologia, é só chamar.";
        } else if (lowerQuery.includes("deivitech") || lowerQuery.includes("seu nome")) {
            response = "Eu sou o DeiviTech, seu assistente de IA para assuntos de tecnologia!";
        }

        setTimeout(() => { // Pequeno delay para simular processamento
            addMessage(response, 'assistant');
            speak(response);
        }, 500);
    }

    // Saudação inicial
    updateStatus('Online', 'online');
    setTimeout(() => {
        const initialGreeting = "Olá! Eu sou o DeiviTech. Clique em 'Iniciar Microfone' para conversarmos.";
        // addMessage(initialGreeting, 'assistant'); // Mensagem já está no HTML
        if(speechSynthesis && voices.length > 0) { // Só fala se houver vozes
             speak(initialGreeting);
        } else if (speechSynthesis) {
            speechSynthesis.onvoiceschanged = () => { // Tenta falar quando as vozes carregarem
                populateVoiceList(); // Garante que a lista está populada
                if(