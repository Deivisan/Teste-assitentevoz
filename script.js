class DeiviTechAssistant {
    constructor() {
        this.isListening = false;
        this.isSpeaking = false;
        this.recognition = null;
        this.voices = [];
        this.currentProvider = 'local';
        
        this.init();
    }

    init() {
        this.setupElements();
        this.setupSpeechRecognition();
        this.setupVoices();
        this.setupEventListeners();
        this.loadVoices();
    }

    setupElements() {
        this.micButton = document.getElementById('micButton');
        this.textInput = document.getElementById('textInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.status = document.getElementById('status');
        this.aiProvider = document.getElementById('aiProvider');
        this.voiceSelect = document.getElementById('voiceSelect');
        this.speechRate = document.getElementById('speechRate');
        this.rateValue = document.getElementById('rateValue');
    }

    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'pt-BR';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateStatus('Ouvindo...', 'listening');
                this.micButton.classList.add('recording');
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                if (finalTranscript) {
                    this.stopListening();
                    this.processUserInput(finalTranscript.trim());
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.stopListening();
                this.updateStatus('Erro no reconhecimento de voz');
            };
            
            this.recognition.onend = () => {
                if (this.isListening && !this.isSpeaking) {
                    // Restart listening if it was intentionally listening
                    setTimeout(() => {
                        if (this.isListening && !this.isSpeaking) {
                            this.recognition.start();
                        }
                    }, 100);
                }
            };
        } else {
            this.updateStatus('Reconhecimento de voz não suportado neste navegador');
        }
    }

    setupVoices() {
        const updateVoices = () => {
            this.voices = speechSynthesis.getVoices();
            this.populateVoiceSelect();
        };
        
        updateVoices();
        
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = updateVoices;
        }
    }

    populateVoiceSelect() {
        this.voiceSelect.innerHTML = '';
        
        // Priorizar vozes em português
        const portugueseVoices = this.voices.filter(voice => 
            voice.lang.includes('pt') || voice.lang.includes('PT')
        );
        
        const otherVoices = this.voices.filter(voice => 
            !voice.lang.includes('pt') && !voice.lang.includes('PT')
        );
        
        [...portugueseVoices, ...otherVoices].forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${voice.name} (${voice.lang})`;
            this.voiceSelect.appendChild(option);
        });
    }

    setupEventListeners() {
        this.micButton.addEventListener('click', () => {
            if (this.isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        });

        this.sendButton.addEventListener('click', () => {
            const text = this.textInput.value.trim();
            if (text) {
                this.processUserInput(text);
                this.textInput.value = '';
            }
        });

        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendButton.click();
            }
        });

        this.aiProvider.addEventListener('change', (e) => {
            this.currentProvider = e.target.value;
            this.updateStatus(`Provedor alterado para: ${e.target.options[e.target.selectedIndex].text}`);
        });

        this.speechRate.addEventListener('input', (e) => {
            this.rateValue.textContent = e.target.value;
        });

        // Suggestion buttons
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.getAttribute('data-text');
                this.processUserInput(text);
            });
        });
    }

    loadVoices() {
        // Wait for voices to load
        setTimeout(() => {
            if (this.voices.length === 0) {
                this.setupVoices();
            }
        }, 1000);
    }

    startListening() {
        if (!this.recognition) {
            this.updateStatus('Reconhecimento de voz não disponível');
            return;
        }

        if (this.isSpeaking) {
            speechSynthesis.cancel();
            this.isSpeaking = false;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
        }
    }

    stopListening() {
        this.isListening = false;
        this.micButton.classList.remove('recording');
        this.updateStatus('Pronto para conversar');
        
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    async processUserInput(text) {
        this.addMessage(text, 'user');
        this.updateStatus('Pensando...');
        
        try {
            const response = await this.getAIResponse(text);
            this.addMessage(response, 'bot');
            this.speak(response);
        } catch (error) {
            console.error('Error getting AI response:', error);
            const errorMsg = 'Desculpe, houve um erro ao processar sua mensagem.';
            this.addMessage(errorMsg, 'bot');
            this.speak(errorMsg);
        }
    }

    async getAIResponse(text) {
        switch (this.currentProvider) {
            case 'openai':
                return await this.getOpenAIResponse(text);
            case 'huggingface':
                return await this.getHuggingFaceResponse(text);
            case 'cohere':
                return await this.getCohereResponse(text);
            default:
                return this.getLocalResponse(text);
        }
    }

    async getOpenAIResponse(text) {
        // Using a free OpenAI-compatible API
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Note: This would need a valid API key for production
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'Você é DeiviTech, um assistente especializado em tecnologia. Responda em português brasileiro de forma natural e conversacional.'
                        },
                        {
                            role: 'user',
                            content: text
                        }
                    ],
                    max_tokens: 150
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            return this.getLocalResponse(text);
        }
    }

    async getHuggingFaceResponse(text) {
        // Using Hugging Face Inference API (free tier available)
        try {
            const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: `Usuário: ${text}\nDeiviTech (especialista em tecnologia):`,
                    parameters: {
                        max_length: 100,
                        temperature: 0.7
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Hugging Face API request failed');
            }

            const data = await response.json();
            return data[0].generated_text.split('DeiviTech (especialista em tecnologia):')[1]?.trim() || this.getLocalResponse(text);
        } catch (error) {
            return this.getLocalResponse(text);
        }
    }

    async getCohereResponse(text) {
        // Cohere has a free tier
        try {
            const response = await fetch('https://api.cohere.ai/v1/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Note: Would need API key for production
                },
                body: JSON.stringify({
                    model: 'command',
                    prompt: `Você é DeiviTech, assistente de tecnologia. Responda em português: ${text}`,
                    max_tokens: 100
                })
            });

            if (!response.ok) {
                throw new Error('Cohere API request failed');
            }

            const data = await response.json();
            return data.generations[0].text.trim();
        } catch (error) {
            return this.getLocalResponse(text);
        }
    }

    getLocalResponse(text) {
        // Local responses for when APIs are not available
        const responses = {
            'react': 'React é uma biblioteca JavaScript para construir interfaces de usuário. É mantida pelo Facebook e é muito popular para desenvolvimento web moderno.',
            'vue': 'Vue.js é um framework JavaScript progressivo para construir interfaces de usuário. É conhecido por sua curva de aprendizado suave.',
            'javascript': 'JavaScript é uma linguagem de programação versátil, usada tanto no frontend quanto no backend com Node.js.',
            'python': 'Python é uma linguagem de programação de alto nível, conhecida por sua sintaxe simples e legibilidade.',
            'inteligência artificial': 'Inteligência Artificial é a capacidade de máquinas realizarem tarefas que normalmente requerem inteligência humana.',
            'machine learning': 'Machine Learning é um subcampo da IA que permite aos sistemas aprenderem automaticamente a partir de dados.',
            'cloud': 'Computação em nuvem permite acessar recursos de computação pela internet, oferecendo escalabilidade e flexibilidade.',
            'default': 'Interessante pergunta sobre tecnologia! Como DeiviTech, posso ajudar com diversos tópicos como programação, IA, desenvolvimento web e muito mais.'
        };

        const lowerText = text.toLowerCase();
        
        for (const [key, response] of Object.entries(responses)) {
            if (lowerText.includes(key)) {
                return response;
            }
        }
        
        return responses.default;
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = text;
        
        messageDiv.appendChild(messageContent);
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        // Auto-scroll to bottom
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    speak(text) {
        if (this.isSpeaking) {
            speechSynthesis.cancel();
        }

        this.isSpeaking = true;
        this.updateStatus('Falando...', 'speaking');

        const utterance = new SpeechSynthesisUtterance(text);
        
        if (this.voiceSelect.value && this.voices[this.voiceSelect.value]) {
            utterance.voice = this.voices[this.voiceSelect.value];
        }
        
        utterance.rate = parseFloat(this.speechRate.value);
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onend = () => {
            this.isSpeaking = false;
            this.updateStatus('Pronto para conversar');
            
            // Auto-restart listening after speaking (for natural conversation)
            setTimeout(() => {
                if (!this.isListening) {
                    this.startListening();
                }
            }, 500);
        };

        utterance.onerror = () => {
            this.isSpeaking = false;
            this.updateStatus('Erro na síntese de voz');
        };

        speechSynthesis.speak(utterance);
    }

    updateStatus(message, className = '') {
        this.status.textContent = message;
        this.status.className = `status ${className}`;
    }
}

// Initialize the assistant when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DeiviTechAssistant();
});