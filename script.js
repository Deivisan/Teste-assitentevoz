document.addEventListener('DOMContentLoaded', () => {
    const GOOGLE_AI_API_KEY = 'AIzaSyBVJI8lkr2QTl1u7FWUjo5au2GGp7EhxFM'; // Your provided API key
    const chatBox = document.getElementById('chat-box');
    const recordButton = document.getElementById('record-button');
    const textInput = document.getElementById('text-input');
    const sendButton = document.getElementById('send-button');
    const voiceSelect = document.getElementById('voice-select');

    // Tab navigation
    const tabs = document.querySelectorAll('nav button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const targetSectionId = tab.id.replace('tab-', '') + '-section';
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetSectionId) {
                    content.classList.add('active');
                }
            });
        });
    });
    // Activate the first tab by default
    if (tabs.length > 0) tabs[0].click();


    // --- DeiviTech Assistant Logic ---
    let recognition;
    let speechSynthesis = window.speechSynthesis;
    let voices = [];
    let isRecording = false;
    let aiSpeaking = false;
    let userSpeaking = false;

    function populateVoiceList() {
        voices = speechSynthesis.getVoices();
        voiceSelect.innerHTML = '';
        voices.forEach((voice, i) => {
            if (voice.lang.startsWith('pt')) { // Prioritize Portuguese voices
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.setAttribute('data-lang', voice.lang);
                option.setAttribute('data-name', voice.name);
                voiceSelect.appendChild(option);
            }
        });
         // If no PT voices, add all
        if (voiceSelect.options.length === 0) {
            voices.forEach((voice, i) => {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.setAttribute('data-lang', voice.lang);
                option.setAttribute('data-name', voice.name);
                voiceSelect.appendChild(option);
            });
        }
    }

    populateVoiceList();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    function speak(text) {
        if (aiSpeaking) return; // Don't interrupt itself
        aiSpeaking = true;
        if (recognition && isRecording) recognition.stop(); // Stop listening if AI starts talking

        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoiceName = voiceSelect.selectedOptions[0]?.getAttribute('data-name');
        if (selectedVoiceName) {
            utterance.voice = voices.find(voice => voice.name === selectedVoiceName);
        }
        utterance.lang = utterance.voice?.lang || 'pt-BR'; // Default to pt-BR
        
        utterance.onstart = () => {
            console.log('DeiviTech started speaking.');
        };
        utterance.onend = () => {
            console.log('DeiviTech finished speaking.');
            aiSpeaking = false;
            // If user was not trying to speak, and recognition was stopped, restart it.
            if (!userSpeaking && recordButton.classList.contains('recording') && recognition) {
                 try { recognition.start(); } catch(e) { console.warn("Recognition already started or error:", e); }
            }
        };
        speechSynthesis.speak(utterance);
    }

    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false; // AI responds after pause
        recognition.interimResults = false;
        recognition.lang = 'pt-BR';

        recognition.onstart = () => {
            userSpeaking = true;
            recordButton.textContent = '🔴 Gravando... Pare';
            recordButton.classList.add('recording');
            if (aiSpeaking && speechSynthesis.speaking) { // If AI is speaking, stop it
                speechSynthesis.cancel();
                aiSpeaking = false;
            }
        };

        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            if (transcript) {
                addMessage(transcript, 'user');
                processQuery(transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            let errorMessage = 'Erro no reconhecimento de voz.';
            if (event.error === 'no-speech') errorMessage = 'Nenhuma fala detectada. Tente novamente.';
            if (event.error === 'audio-capture') errorMessage = 'Problema na captura de áudio. Verifique seu microfone.';
            if (event.error === 'not-allowed') errorMessage = 'Permissão para microfone negada.';
            addMessage(errorMessage, 'assistant');
            speak(errorMessage);
            stopRecording();
        };

        recognition.onend = () => {
            userSpeaking = false;
            if (isRecording) { // If still in recording mode, try to restart unless AI is about to speak
                if (!aiSpeaking) {
                    try { recognition.start(); } catch(e) { console.warn("Could not restart recognition immediately", e); }
                }
            } else {
                recordButton.textContent = '🎤 Iniciar Gravação';
                recordButton.classList.remove('recording');
            }
        };

    } else {
        recordButton.disabled = true;
        recordButton.textContent = 'Voz não suportada';
        addMessage('Seu navegador não suporta reconhecimento de voz.', 'assistant');
    }
    
    function startRecording() {
        if (!recognition) return;
        if (aiSpeaking && speechSynthesis.speaking) {
            speechSynthesis.cancel(); // Stop AI if it's talking
            aiSpeaking = false;
        }
        isRecording = true;
        try {
            recognition.start();
        } catch (e) {
            console.warn("Recognition start failed, likely already started or an issue:", e);
        }
    }

    function stopRecording() {
        if (!recognition) return;
        isRecording = false;
        userSpeaking = false;
        try {
            recognition.stop();
        } catch (e) {
            console.warn("Recognition stop failed, likely already stopped:", e);
        }
        recordButton.textContent = '🎤 Iniciar Gravação';
        recordButton.classList.remove('recording');
    }

    recordButton.addEventListener('click', () => {
        if (!recognition) return;
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    sendButton.addEventListener('click', () => {
        const text = textInput.value.trim();
        if (text) {
            addMessage(text, 'user');
            processQuery(text);
            textInput.value = '';
        }
    });

    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendButton.click();
        }
    });

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        messageDiv.textContent = text;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function processQuery(query) {
        // If AI is speaking, wait or queue. For simplicity, just stop it.
        if (aiSpeaking && speechSynthesis.speaking) {
            speechSynthesis.cancel();
            aiSpeaking = false;
        }
        if (recognition && isRecording) recognition.stop(); // Stop listening while processing and before AI speaks


        const deiviTechSystemPrompt = `Você é DeiviTech, um assistente de IA masculino especializado em tecnologia. Suas respostas devem ser informativas, úteis e focadas em tecnologia. Seja amigável e use português do Brasil. Responda à seguinte pergunta do usuário: ${query}`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GOOGLE_AI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: deiviTechSystemPrompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 1,
                        topP: 1,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Google AI API Error:', errorData);
                throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            let aiResponse = "Desculpe, não consegui processar isso.";
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                aiResponse = data.candidates[0].content.parts[0].text;
            }
            
            addMessage(aiResponse, 'assistant');
            speak(aiResponse);

        } catch (error) {
            console.error('Error processing query:', error);
            const errorMessage = `Erro ao contatar a IA: ${error.message}. Tente novamente.`;
            addMessage(errorMessage, 'assistant');
            speak(errorMessage);
        } finally {
            // Ensure recognition restarts if it was active, after a slight delay for speech to start
            setTimeout(() => {
                if (isRecording && recognition && !aiSpeaking) {
                    try { recognition.start(); } catch(e) { console.warn("Delayed recognition restart failed:", e); }
                }
            }, 500);
        }
    }

    // --- Live Chat Logic ---
    const liveChatMessages = document.getElementById('live-chat-messages');
    const chatNameInput = document.getElementById('chat-name');
    const chatMessageInput = document.getElementById('chat-message');
    const sendChatMessageButton = document.getElementById('send-chat-message');

    // Load name and messages from localStorage
    chatNameInput.value = localStorage.getItem('chatUserName') || '';
    let messages = JSON.parse(localStorage.getItem('liveChatMessages')) || [];

    function displayChatMessages() {
        liveChatMessages.innerHTML = '';
        messages.forEach(msg => addChatMessageToDOM(msg.name, msg.text, msg.timestamp));
        liveChatMessages.scrollTop = liveChatMessages.scrollHeight;
    }

    function addChatMessageToDOM(name, text, timestamp) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('chat-message-item');
        
        const nameSpan = document.createElement('strong');
        if (name.toLowerCase() === 'deivi') {
            const crown = document.createElement('span');
            crown.classList.add('admin-crown');
            crown.textContent = '👑 ';
            nameSpan.appendChild(crown);
        }
        nameSpan.appendChild(document.createTextNode(name + ': '));
        
        const textSpan = document.createElement('span');
        textSpan.textContent = text;

        const timeSpan = document.createElement('small');
        timeSpan.style.display = 'block';
        timeSpan.style.color = '#777';
        timeSpan.style.fontSize = '0.8em';
        timeSpan.textContent = new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'});

        msgDiv.appendChild(nameSpan);
        msgDiv.appendChild(textSpan);
        msgDiv.appendChild(timeSpan);
        liveChatMessages.appendChild(msgDiv);
    }

    sendChatMessageButton.addEventListener('click', () => {
        const name = chatNameInput.value.trim();
        const messageText = chatMessageInput.value.trim();

        if (!name) {
            alert('Por favor, insira seu nome.');
            chatNameInput.focus();
            return;
        }
        if (!messageText) {
            alert('Por favor, digite uma mensagem.');
            chatMessageInput.focus();
            return;
        }

        localStorage.setItem('chatUserName', name); // Save name

        const newMessage = {
            name: name,
            text: messageText,
            timestamp: new Date().toISOString()
        };
        messages.push(newMessage);
        localStorage.setItem('liveChatMessages', JSON.stringify(messages));

        addChatMessageToDOM(name, messageText, newMessage.timestamp);
        liveChatMessages.scrollTop = liveChatMessages.scrollHeight;
        chatMessageInput.value = '';
    });
    
    chatMessageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessageButton.click();
        }
    });

    // Initial display
    displayChatMessages();

    // --- Suggestions Section (Simulated) ---
    const suggestionForm = document.getElementById('suggestion-form');
    suggestionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const suggestionText = document.getElementById('suggestion-text').value;
        if (suggestionText.trim()) {
            alert('Obrigado pela sua sugestão!\n(Simulação: esta sugestão não foi enviada para um servidor, use o WhatsApp para contato real.)');
            document.getElementById('suggestion-text').value = '';
        } else {
            alert('Por favor, escreva sua sugestão.');
        }
    });

    // Initial greeting from DeiviTech if supported
    if (speechSynthesis) {
        // Wait a bit for voices to load, then greet.
        setTimeout(() => {
             speak("Olá! Eu sou o DeiviTech. Como posso ajudar você com tecnologia hoje?");
        }, 500);
    }

});