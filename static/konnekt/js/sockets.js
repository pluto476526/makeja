// // konnekt/sockets.js






// konnekt/sockets.js

document.addEventListener("DOMContentLoaded", () => {
    // --- Constants and Config ---
    const currentUserID = window.currentUserID;
    const senderID = window.senderID;
    const convoID = window.convoID;
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const RECONNECT_DELAY = 5000;
    const MAX_RECONNECT_DELAY = 60000;
    const readMessages = new Set();
    let currentStatuses = []; // Added missing declaration

    // --- WebSocket Instances ---
    let recentChatsSocket = null;
    let chatSocket = null;
    let onlineStatusSocket = null;

    // --- Reconnection State ---
    const reconnectState = {
        recent: { timeout: null, attempts: 0 },
        chat: { timeout: null, attempts: 0 },
        status: { timeout: null, attempts: 0 }
    };

    // --- DOM Elements ---
    const elements = {
        recentChatsList: document.getElementById("recent-chats-list"),
        msgForm: document.getElementById("msgForm"),
        msgBox: document.getElementById("msgBox"),
        sendBtn: document.getElementById("sendBtn"),
        chatItem: document.querySelectorAll(".tyn-reply-item"),
        chatBody: document.getElementById("tynChatBody"),
        statusBox: document.querySelector(`.online-status`),
    };

    // --- Utility Functions ---
    const escapeHtml = (unsafe) => 
        String(unsafe).replace(/[&<"'>]/g, tag =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[tag]
        );

    const naturalTime = (dateString) => {
        if (!dateString) return "Never";
        try {
            const date = new Date(dateString);
            const now = new Date();
            const delta = (now - date) / 1000;

            if (delta < 60) return "Just now";
            if (delta < 3600) return `${Math.floor(delta / 60)} min ago`;
            if (delta < 86400) return `${Math.floor(delta / 3600)} hrs ago`;
            if (delta < 172800) return "Yesterday";

            return date.toLocaleDateString();
        } catch {
            return escapeHtml(dateString);
        }
    };

    const exponentialBackoff = (attempts) =>
        Math.min(RECONNECT_DELAY * 2 ** attempts, MAX_RECONNECT_DELAY);

    // --- Message Handling ---
    const getInitialStatuses = () => {
        if (onlineStatusSocket?.readyState !== WebSocket.OPEN) return;
        onlineStatusSocket.send(JSON.stringify({ type: "get_initial_statuses" }));
    };

    const markAsRead = (txtID, userID) => {
        if (readMessages.has(txtID) || chatSocket?.readyState !== WebSocket.OPEN) return;

        const data = {
            type: "text_read_status",
            t_id: txtID,
            u_id: userID,
            timestamp: Date.now(),
        };

        chatSocket.send(JSON.stringify(data));
        readMessages.add(txtID);
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const msgID = entry.target.dataset.textId;
                markAsRead(msgID, currentUserID);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    const observeMessages = () => {
        document.querySelectorAll('.tyn-reply-item').forEach(msg => {
            if (!msg.dataset.observed) {
                observer.observe(msg);
                msg.dataset.observed = 'true';

                const rect = msg.getBoundingClientRect();
                const fullyVisible = (
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                );

                if (fullyVisible) {
                    const msgID = msg.dataset.textId;
                    markAsRead(msgID, currentUserID);
                    observer.unobserve(msg);
                }
            }
        });
    };

    // --- Status Indicator Functions ---
    const updateStatusElement = (element, statusObject) => {
        if (!element) return;
        
        if (statusObject.status === "online") {
            element.innerHTML = "Active";
        } else {
            const readableTime = naturalTime(statusObject.last_seen);
            element.innerHTML = "last seen " + readableTime;
        }
    };

    const updateStatusIndicator = (statusObject) => {
        const elementId = "status-" + statusObject.user_id;
        const indicatorElement = document.getElementById(elementId);
        
        if (indicatorElement) {
            indicatorElement.style.display = statusObject.status === "online" ? "flex" : "none";
        }
    };

    const waitForElement = (getElementFunction, callbackFunction, maxAttempts = 10, intervalMs = 100) => {
        let attemptCount = 0;

        const intervalId = setInterval(() => {
            const targetElement = getElementFunction();

            if (targetElement) {
                clearInterval(intervalId);
                callbackFunction(targetElement);
            } else if (++attemptCount >= maxAttempts) {
                clearInterval(intervalId);
                console.warn("Element not found after max attempts");
            }
        }, intervalMs);
    };

    function initialStatusIndicators(data) {
        currentStatuses = data.statuses;
        data.statuses.forEach(function(statusObject) {
            const userId = statusObject.user_id;
            const elementId = "status-" + userId;

            waitForElement(
                function() {
                    return document.getElementById(elementId);
                },
                function(indicatorElement) {
                    if (statusObject.status === "online") {
                        indicatorElement.style.display = "flex";
                    } else {
                        indicatorElement.style.display = "none";
                    }
                }
            );
        });
    }

    // --- Rendering Functions ---
    const renderRecentChats = (chats) => {
        const list = elements.recentChatsList;
        if (!Array.isArray(chats)) return;

        list.innerHTML = chats.length === 0
            ? `<li class="text-center text-muted py-3">No recent chats</li>`
            : chats.map(chat => {
                const friend = chat.participants?.[0] || {};
                const avatar = escapeHtml(friend.avatar_url);
                const title = escapeHtml(chat.title || friend.username);
                const chatID = escapeHtml(chat.c_id);
                const lastMessage = escapeHtml(chat.last_message || "No message yet");
                const time = naturalTime(chat.timestamp);

                return `
                <li class="tyn-aside-item">
                    <div class="tyn-media-group">
                        <div class="tyn-media tyn-size-lg">
                            <img src="${avatar}" alt="">
                        </div>
                        <div class="tyn-media-col">
                            <div class="tyn-media-row">
                                <h6 class="name">${title}</h6>
                                <div class="indicator varified" id="status-${friend.userID}" style="display: none;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                                        class="bi bi-check-circle-fill" viewBox="0 0 16 16">
                                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 
                                            0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 
                                            1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 
                                            0 0 0-.01-1.05z"/>
                                    </svg>
                                </div>
                            </div>
                            <div class="tyn-media-row has-dot-sap">
                                <span class="badge bg-success">${chat.unread_count}</span>
                                <p class="content">${lastMessage}</p>
                                <span class="meta">${time}</span>
                            </div>
                        </div>
                        <div class="tyn-media-option tyn-aside-item-option">
                            <ul class="tyn-media-option-list">
                                <li class="dropdown">
                                    <button class="btn btn-icon btn-white btn-pill dropdown-toggle"
                                        data-bs-toggle="dropdown" data-bs-offset="0,0" data-bs-auto-close="outside">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                            fill="currentColor" class="bi bi-three-dots" viewBox="0 0 16 16">
                                            <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 
                                                1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                                        </svg>
                                    </button>
                                    <div class="dropdown-menu dropdown-menu-end">
                                        <ul class="tyn-list-links">
                                            <li><a href="#"><span>Mark as Read</span></a></li>
                                            <li><a href="#"><span>Mute Notifications</span></a></li>
                                            <li><a href="#"><span>View Profile</span></a></li>
                                            <li class="dropdown-divider"></li>
                                            <li><a href="#"><span>Archive</span></a></li>
                                            <li><a href="#deleteChat" data-bs-toggle="modal"><span>Delete</span></a></li>
                                            <li><a href="#"><span>Report</span></a></li>
                                        </ul>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </li>`;
            }).join('');

        initialStatusIndicators({ statuses: currentStatuses });
    };

    const renderText = (data) => {
        const isOutgoing = data.sender_id === currentUserID;
        const time = naturalTime(data.timestamp);
        const text = escapeHtml(data.text);
        const senderAvatar = window.senderAvatar;

        const html = isOutgoing ? createOutgoingMessageHtml(data.text_id, time, text) 
                               : createIncomingMessageHtml(data.text_id, time, text, senderAvatar);

        if (elements.chatBody) {
            elements.chatBody.insertAdjacentHTML('beforeend', html);
            elements.chatBody.scrollTop = elements.chatBody.scrollHeight;
            observeMessages();
        }
    };

    const createOutgoingMessageHtml = (textId, time, text) => {
        return `
        <div class="tyn-reply py-0" id="tynReply">
            <div class="tyn-reply-item outgoing" data-text-id="${textId}">
                <div class="tyn-reply-group">
                    <div class="tyn-reply-bubble">
                        <div class="tyn-reply-text">
                            <div class="d-flex justify-content-between align-items-center ticks">
                                <small class="">${time}</small>&nbsp;
                                <div class="indicator varified tick" style="display: none;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" class="bi bi-check-circle-fill" viewbox="0 0 16 16">
                                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"></path>
                                    </svg>
                                </div>
                            </div>
                            ${text} </div>
                        <ul class="tyn-reply-tools">
                            <li>
                                <button class="btn btn-icon btn-sm btn-transparent btn-pill">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-emoji-smile-fill" viewbox="0 0 16 16">
                                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5zM4.285 9.567a.5.5 0 0 1 .683.183A3.498 3.498 0 0 0 8 11.5a3.498 3.498 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.498 4.498 0 0 1 8 12.5a4.498 4.498 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683zM10 8c-.552 0-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5S10.552 8 10 8z"></path>
                                    </svg>
                                </button>
                            </li>
                            <li class="dropup-center">
                                <button class="btn btn-icon btn-sm btn-transparent btn-pill" data-bs-toggle="dropdown">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots" viewbox="0 0 16 16">
                                        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path>
                                    </svg>
                                </button>
                                <div class="dropdown-menu dropdown-menu-xxs">
                                    <ul class="tyn-list-links">
                                        <li>
                                            <a href="#">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewbox="0 0 16 16">
                                                    <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"></path>
                                                    <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"></path>
                                                </svg>
                                                <span>Edit</span>
                                            </a>
                                        </li>
                                        <li>
                                            <a href="#">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewbox="0 0 16 16">
                                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"></path>
                                                    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"></path>
                                                </svg>
                                                <span>Delete</span>
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>`;
    };

    const createIncomingMessageHtml = (textId, time, text, senderAvatar) => {
        return `
        <div class="tyn-reply py-0" id="tynReply">
            <div class="tyn-reply-item incoming" data-text-id="${textId}">
                <div class="tyn-reply-avatar">
                    <div class="tyn-media tyn-size-md tyn-circle">
                        <img src="${senderAvatar}" alt="">
                    </div>
                </div>
                <div class="tyn-reply-group">
                    <div class="tyn-reply-bubble">
                        <div class="tyn-reply-text">
                            <div>
                                <small class="">${time}</small>
                            </div> 
                            ${text} </div>
                        <ul class="tyn-reply-tools">
                            <li>
                                <button class="btn btn-icon btn-sm btn-transparent btn-pill">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-emoji-smile-fill" viewbox="0 0 16 16">
                                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5zM4.285 9.567a.5.5 0 0 1 .683.183A3.498 3.498 0 0 0 8 11.5a3.498 3.498 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.498 4.498 0 0 1 8 12.5a4.498 4.498 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683zM10 8c-.552 0-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5S10.552 8 10 8z"></path>
                                    </svg>
                                </button>
                            </li>
                            <li class="dropup-center">
                                <button class="btn btn-icon btn-sm btn-transparent btn-pill" data-bs-toggle="dropdown">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots" viewbox="0 0 16 16">
                                        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path>
                                    </svg>
                                </button>
                                <div class="dropdown-menu dropdown-menu-xxs">
                                    <ul class="tyn-list-links">
                                        <li>
                                            <a href="#">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewbox="0 0 16 16">
                                                    <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"></path>
                                                    <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"></path>
                                                </svg>
                                                <span>Edit</span>
                                            </a>
                                        </li>
                                        <li>
                                            <a href="#">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewbox="0 0 16 16">
                                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"></path>
                                                    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"></path>
                                                </svg>
                                                <span>Delete</span>
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>`;
    };

    const showReadMark = (data) => {
        if (data.user_id === currentUserID) return;
        const msg = document.querySelector(`.tyn-reply-item.outgoing[data-text-id="${data.txt_id}"]`);
        if (msg) {
            const tick = msg.querySelector(".tick");
            if (tick) tick.style.display = "inline";
        }
    };

    // --- WebSocket Connections ---
    const connectRecentChatsSocket = () => {
        if (recentChatsSocket) recentChatsSocket.close();
        clearTimeout(reconnectState.recent.timeout);

        const wsUrl = `${wsProtocol}://${location.host}/ws/konnekt/r-chats/${currentUserID}/`;
        recentChatsSocket = new WebSocket(wsUrl);

        if (elements.recentChatsList) {
            elements.recentChatsList.innerHTML = `<li class="text-center text-muted py-3">Fetching Conversations...</li>`;
        }

        recentChatsSocket.onopen = () => {
            console.log("[RecentChats] Connected");
            reconnectState.recent.attempts = 0;
        };

        recentChatsSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "recent_chats") renderRecentChats(data.recent_chats);
        };

        recentChatsSocket.onclose = () => {
            console.warn("[RecentChats] Disconnected. Reconnecting...");
            reconnectState.recent.attempts++;
            const delay = exponentialBackoff(reconnectState.recent.attempts);
            reconnectState.recent.timeout = setTimeout(connectRecentChatsSocket, delay);
        };

        recentChatsSocket.onerror = (error) => {
            console.error("[RecentChats] WebSocket error:", error);
        };
    };

    const connectChatSocket = () => {
        if (chatSocket) chatSocket.close();
        clearTimeout(reconnectState.chat.timeout);

        const wsUrl = `${wsProtocol}://${location.host}/ws/konnekt/chat/${convoID}/`;
        chatSocket = new WebSocket(wsUrl);

        chatSocket.onopen = () => {
            console.log("[Chat] Connected");
            reconnectState.chat.attempts = 0;
        };

        chatSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "text_message") renderText(data);
            if (data.type === "text_read_status") showReadMark(data);
        };

        chatSocket.onclose = () => {
            reconnectState.chat.attempts++;
            const delay = exponentialBackoff(reconnectState.chat.attempts);
            reconnectState.chat.timeout = setTimeout(connectChatSocket, delay);
        };

        chatSocket.onerror = (error) => {
            console.error("[Chat] websocket error: ", error);
        };
    };

    const connectOnlineStatusSocket = () => {
        if (onlineStatusSocket) onlineStatusSocket.close();
        clearTimeout(reconnectState.status.timeout);

        const wsUrl = `${wsProtocol}://${location.host}/ws/konnekt/status/${currentUserID}/`;
        onlineStatusSocket = new WebSocket(wsUrl);

        onlineStatusSocket.onopen = () => {
            console.log("[Status] Connected");
            getInitialStatuses();
            reconnectState.status.attempts = 0;
        };

        onlineStatusSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "initial_statuses") {
                currentStatuses = data.statuses;
                initialStatusIndicators(data);
            }

            if (data.type === "status_update") {
                updateStatusIndicator(data);
            }
        };

        onlineStatusSocket.onclose = () => {
            reconnectState.status.attempts++;
            const delay = exponentialBackoff(reconnectState.status.attempts);
            reconnectState.status.timeout = setTimeout(connectOnlineStatusSocket, delay);
        };

        onlineStatusSocket.onerror = (error) => {
            console.error("[Status] websocket error: ", error);
        };
    };

    // --- Event Listeners ---
    const setupEventListeners = () => {
        if (elements.sendBtn && elements.msgBox) {
            elements.sendBtn.addEventListener("click", (e) => {
                e.preventDefault();
                sendMessage();
            });

            elements.msgBox.addEventListener("keypress", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    elements.sendBtn.click();
                }
            });
        }
    };

    const sendMessage = () => {
        const text = elements.msgBox?.value.trim();
        if (!text || chatSocket?.readyState !== WebSocket.OPEN) return;

        const data = JSON.stringify({
            type: "text_message",
            text: text,
            sender_id: currentUserID,
            c_id: convoID,
            timestamp: Date.now(),
        });

        chatSocket.send(data);
        elements.msgBox.value = "";
    };

    // --- Initialization ---
    const initialize = () => {
        connectOnlineStatusSocket();
        connectRecentChatsSocket();
        connectChatSocket();
        observeMessages();
        setupEventListeners();
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            observer.disconnect();
            if (chatSocket) chatSocket.close();
            if (recentChatsSocket) recentChatsSocket.close();
            if (onlineStatusSocket) onlineStatusSocket.close();
        });
    };

    initialize();
});















// document.addEventListener("DOMContentLoaded", () => {
//     const currentUserID = window.currentUserID;
//     const senderID = window.senderID;
//     const convoID = window.convoID;
//     const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
//     const RECONNECT_DELAY = 5000;
//     const MAX_RECONNECT_DELAY = 60000;
//     const readMessages = new Set();

//     let recentChatsSocket = null;
//     let chatSocket = null;
//     let onlineStatusSocket = null;

//     let recentReconnectTimeout = null;
//     let recentReconnectAttempts = 0;

//     let chatReconnectTimeout = null;
//     let chatReconnectAttempts = 0;

//     let statusReconnectTimeout = null;
//     let statusReconnectAttempts = 0;


//     const elements = {
//         recentChatsList: document.getElementById("recent-chats-list"),
//         msgForm: document.getElementById("msgForm"),
//         msgBox: document.getElementById("msgBox"),
//         sendBtn: document.getElementById("sendBtn"),
//         chatItem: document.querySelectorAll(".tyn-reply-item"),
//         chatBody: document.getElementById("tynChatBody"),
//         statusBox: document.querySelector(`.online-status`),
//     };

//     // --- Utility Functions ---

//     const escapeHtml = (unsafe) =>
//         String(unsafe).replace(/[&<"'>]/g, tag =>
//             ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[tag]
//         );

//     const naturalTime = (dateString) => {
//         if (!dateString) return "Never";
//         try {
//             const date = new Date(dateString);
//             const now = new Date();
//             const delta = (now - date) / 1000;

//             if (delta < 60) return "Just now";
//             if (delta < 3600) return `${Math.floor(delta / 60)} min ago`;
//             if (delta < 86400) return `${Math.floor(delta / 3600)} hrs ago`;
//             if (delta < 172800) return "Yesterday";

//             return date.toLocaleDateString();
//         } catch {
//             return escapeHtml(dateString);
//         }
//     };

//     const exponentialBackoff = (attempts) =>
//         Math.min(RECONNECT_DELAY * 2 ** attempts, MAX_RECONNECT_DELAY);
    

//     function getInitialStatuses() {
//         if (onlineStatusSocket.readyState !== WebSocket.OPEN) return;
//         const data = {type: "get_initial_statuses"};
//         onlineStatusSocket.send(JSON.stringify(data));
//     }


//     function markAsRead(txtID, userID) {
//         if (readMessages.has(txtID)) return;
//         if (chatSocket.readyState !== WebSocket.OPEN) return;

//         const data = {
//             type: "text_read_status",
//             t_id: txtID,
//             u_id: userID,
//             timestamp: Date.now(),
//         };

//         chatSocket.send(JSON.stringify(data));
//         readMessages.add(txtID);
//     }

//     const observer = new IntersectionObserver((entries) => {
//         entries.forEach(entry => {
//             if (entry.isIntersecting) {
//                 const msgID = entry.target.dataset.textId;
//                 markAsRead(msgID, currentUserID);
//                 observer.unobserve(entry.target);
//             }
//         });
//     }, { threshold: 0.1 });


//     function observeMessages() {
//         document.querySelectorAll('.tyn-reply-item').forEach(msg => {
//             if (!msg.dataset.observed) {
//                 observer.observe(msg);
//                 msg.dataset.observed = 'true';

//                 const rect = msg.getBoundingClientRect();
//                 const fullyVisible = (
//                     rect.top >= 0 &&
//                     rect.left >= 0 &&
//                     rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
//                     rect.right <= (window.innerWidth || document.documentElement.clientWidth)
//                 );

//                 if (fullyVisible) {
//                     const msgID = msg.dataset.textId;
//                     markAsRead(msgID, currentUserID);
//                     observer.unobserve(msg);
//                 }
//             }
//         });
//     }

//     function showReadMark(data) {
//         if (data.user_id === currentUserID) return;
//         const msg = document.querySelector(`.tyn-reply-item.outgoing[data-text-id="${data.txt_id}"]`);
//         if (msg) {
//             const tick = msg.querySelector(".tick");
//             if (tick) tick.style.display = "inline";
//         }
//     }


//     function waitForElement(getElementFunction, callbackFunction, maxAttempts = 10, intervalMs = 100) {
//         let attemptCount = 0;

//         const intervalId = setInterval(() => {
//             const targetElement = getElementFunction();

//             if (targetElement) {
//                 clearInterval(intervalId);
//                 callbackFunction(targetElement);
//             } else {
//                 attemptCount += 1;
//                 if (attemptCount >= maxAttempts) {
//                     clearInterval(intervalId);
//                     console.warn("Element not found after max attempts");
//                 }
//             }
//         }, intervalMs);
//     }

//     function initialChatIndicator(data) {
//         currentStatuses = data.statuses;
//         data.statuses.forEach(function(statusObject) {
//             if (statusObject.user_id != senderID) return;

//             waitForElement(
//                 function() {
//                     return elements.statusBox;
//                 },
//                 function(statusBoxElement) {
//                     if (statusObject.status === "online") {
//                         statusBoxElement.innerHTML = "Active";
//                     } else {
//                         const time = naturalTime(statusObject.last_seen);
//                         statusBoxElement.innerHTML = "last seen " + time;
//                     }
//                 }
//             );
            
//         });
//     }


//     function updateIndicator(data) {
//         waitForElement(
//             function() {
//                 return elements.statusBox;
//             },
//             function(statusBoxElement) {
//                 if (data.status === "online") {
//                     statusBoxElement.innerHTML = "Active";
//                 } else {
//                     const readableTime = naturalTime(data.last_seen);
//                     statusBoxElement.innerHTML = "last seen " + readableTime;
//                 }
//             }
//         );
//     }


//     function initialStatusIndicators(data) {
//         currentStatuses = data.statuses;
//         data.statuses.forEach(function(statusObject) {
//             const userId = statusObject.user_id;
//             const elementId = "status-" + userId;

//             waitForElement(
//                 function() {
//                     return document.getElementById(elementId);
//                 },
//                 function(indicatorElement) {
//                     if (statusObject.status === "online") {
//                         indicatorElement.style.display = "flex";
//                     } else {
//                         indicatorElement.style.display = "none";
//                     }
//                 }
//             );
//         });
//     }

//     function updateStatusIndicator(statusObject) {
//         const userId = statusObject.user_id;
//         const elementId = "status-" + userId;

//         waitForElement(
//             function() {
//                 return document.getElementById(elementId);
//             },
//             function(indicatorElement) {
//                 if (statusObject.status === "online") {
//                     indicatorElement.style.display = "flex";
//                 } else {
//                     indicatorElement.style.display = "none";
//                 }
//             }
//         );
//     }




//     const renderRecentChats = (chats) => {
//         const list = elements.recentChatsList;
//         if (!Array.isArray(chats) || !list) return;

//         list.innerHTML = chats.length === 0
//             ? `<li class="text-center text-muted py-3">No recent chats</li>`
//             : chats.map(chat => {
//                 const friend = chat.participants?.[0] || {};
//                 const avatar = escapeHtml(friend.avatar_url);
//                 const title = escapeHtml(chat.title || friend.username);
//                 const chatID = escapeHtml(chat.c_id);
//                 const lastMessage = escapeHtml(chat.last_message || "No message yet");
//                 const time = naturalTime(chat.timestamp);

//                 return `
//                 <li class="tyn-aside-item">
//                     <div class="tyn-media-group">
//                         <div class="tyn-media tyn-size-lg">
//                             <img src="${avatar}" alt="">
//                         </div>
//                         <div class="tyn-media-col">
//                             <div class="tyn-media-row">
//                                 <h6 class="name">${title}</h6>
//                                 <div class="indicator varified" id="status-${friend.userID}" style="display: none;">
//                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
//                                         class="bi bi-check-circle-fill" viewBox="0 0 16 16">
//                                         <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 
//                                             0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 
//                                             1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 
//                                             0 0 0-.01-1.05z"/>
//                                     </svg>
//                                 </div>
//                             </div>
//                             <div class="tyn-media-row has-dot-sap">
//                                 <span class="badge bg-success">${chat.unread_count}</span>
//                                 <p class="content">${lastMessage}</p>
//                                 <span class="meta">${time}</span>
//                             </div>
//                         </div>
//                         <div class="tyn-media-option tyn-aside-item-option">
//                             <ul class="tyn-media-option-list">
//                                 <li class="dropdown">
//                                     <button class="btn btn-icon btn-white btn-pill dropdown-toggle"
//                                         data-bs-toggle="dropdown" data-bs-offset="0,0" data-bs-auto-close="outside">
//                                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
//                                             fill="currentColor" class="bi bi-three-dots" viewBox="0 0 16 16">
//                                             <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 
//                                                 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 
//                                                 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 
//                                                 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
//                                         </svg>
//                                     </button>
//                                     <div class="dropdown-menu dropdown-menu-end">
//                                         <ul class="tyn-list-links">
//                                             <li><a href="#"><span>Mark as Read</span></a></li>
//                                             <li><a href="#"><span>Mute Notifications</span></a></li>
//                                             <li><a href="#"><span>View Profile</span></a></li>
//                                             <li class="dropdown-divider"></li>
//                                             <li><a href="#"><span>Archive</span></a></li>
//                                             <li><a href="#deleteChat" data-bs-toggle="modal"><span>Delete</span></a></li>
//                                             <li><a href="#"><span>Report</span></a></li>
//                                         </ul>
//                                     </div>
//                                 </li>
//                             </ul>
//                         </div>
//                     </div>
//                 </li>`;
//             }).join('');
//         initialStatusIndicators({ statuses: currentStatuses });
//     };


//     function renderText(data) {

//         const isOutgoing = data.sender_id === currentUserID;
//         const time = naturalTime(data.timestamp);
//         const text = escapeHtml(data.text);
//         const senderAvatar = window.senderAvatar;

//         const html = isOutgoing
//             ?
//             `<div class="tyn-reply py-0" id="tynReply">
//                 <div class="tyn-reply-item outgoing" data-text-id="${data.text_id}">
//                     <div class="tyn-reply-group">
//                         <div class="tyn-reply-bubble">
//                             <div class="tyn-reply-text">
//                                 <div class="d-flex justify-content-between align-items-center ticks">
//                                     <small class="">${time}</small>&nbsp;
//                                     <div class="indicator varified tick" style="display: none;">
//                                         <!-- check-circle-fill -->
//                                         <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" class="bi bi-check-circle-fill" viewbox="0 0 16 16">
//                                             <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"></path>
//                                         </svg>
//                                     </div>
//                                 </div>
//                                 ${text} </div><!-- tyn-reply-text -->
//                             <ul class="tyn-reply-tools">
//                                 <li>
//                                     <button class="btn btn-icon btn-sm btn-transparent btn-pill">
//                                         <!-- emoji-smile-fill -->
//                                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-emoji-smile-fill" viewbox="0 0 16 16">
//                                             <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5zM4.285 9.567a.5.5 0 0 1 .683.183A3.498 3.498 0 0 0 8 11.5a3.498 3.498 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.498 4.498 0 0 1 8 12.5a4.498 4.498 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683zM10 8c-.552 0-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5S10.552 8 10 8z"></path>
//                                         </svg>
//                                     </button>
//                                 </li><!-- li -->
//                                 <li class="dropup-center">
//                                     <button class="btn btn-icon btn-sm btn-transparent btn-pill" data-bs-toggle="dropdown">
//                                         <!-- three-dots -->
//                                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots" viewbox="0 0 16 16">
//                                             <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path>
//                                         </svg>
//                                     </button>
//                                     <div class="dropdown-menu dropdown-menu-xxs">
//                                         <ul class="tyn-list-links">
//                                             <li>
//                                                 <a href="#">
//                                                     <!-- pencil-square -->
//                                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewbox="0 0 16 16">
//                                                         <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"></path>
//                                                         <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"></path>
//                                                     </svg>
//                                                     <span>Edit</span>
//                                                 </a>
//                                             </li>
//                                             <li>
//                                                 <a href="#">
//                                                     <!-- trash -->
//                                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewbox="0 0 16 16">
//                                                         <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"></path>
//                                                         <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"></path>
//                                                     </svg>
//                                                     <span>Delete</span>
//                                                 </a>
//                                             </li>
//                                         </ul>
//                                     </div>
//                                 </li>
//                             </ul>
//                         </div>
//                     </div>
//                 </div>
//             </div>`
//             :
//             `<div class="tyn-reply py-0" id="tynReply">
//                 <div class="tyn-reply-item incoming" data-text-id="${data.text_id}">
//                     <div class="tyn-reply-avatar">
//                         <div class="tyn-media tyn-size-md tyn-circle">
//                             <img src="${senderAvatar}" alt="">
//                         </div>
//                     </div>
//                     <div class="tyn-reply-group">
//                         <div class="tyn-reply-bubble">
//                             <div class="tyn-reply-text">
//                                 <div>
//                                     <small class="">${time}</small>
//                                 </div> 
//                                  ${text} </div>
//                             <ul class="tyn-reply-tools">
//                                 <li>
//                                     <button class="btn btn-icon btn-sm btn-transparent btn-pill">
//                                         <!-- emoji-smile-fill -->
//                                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-emoji-smile-fill" viewbox="0 0 16 16">
//                                             <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5zM4.285 9.567a.5.5 0 0 1 .683.183A3.498 3.498 0 0 0 8 11.5a3.498 3.498 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.498 4.498 0 0 1 8 12.5a4.498 4.498 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683zM10 8c-.552 0-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5S10.552 8 10 8z"></path>
//                                         </svg>
//                                     </button>
//                                 </li><!-- li -->
//                                 <li class="dropup-center">
//                                     <button class="btn btn-icon btn-sm btn-transparent btn-pill" data-bs-toggle="dropdown">
//                                         <!-- three-dots -->
//                                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots" viewbox="0 0 16 16">
//                                             <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path>
//                                         </svg>
//                                     </button>
//                                     <div class="dropdown-menu dropdown-menu-xxs">
//                                         <ul class="tyn-list-links">
//                                             <li>
//                                                 <a href="#">
//                                                     <!-- pencil-square -->
//                                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewbox="0 0 16 16">
//                                                         <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"></path>
//                                                         <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"></path>
//                                                     </svg>
//                                                     <span>Edit</span>
//                                                 </a>
//                                             </li>
//                                             <li>
//                                                 <a href="#">
//                                                     <!-- trash -->
//                                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewbox="0 0 16 16">
//                                                         <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"></path>
//                                                         <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"></path>
//                                                     </svg>
//                                                     <span>Delete</span>
//                                                 </a>
//                                             </li>
//                                         </ul>
//                                     </div>
//                                 </li>
//                             </ul>
//                         </div>
//                     </div>
//                 </div>
//             </div>`;

//         elements.chatBody.insertAdjacentHTML('beforeend', html);
//         elements.chatBody.scrollTop = elements.chatBody.scrollHeight;
//         observeMessages();
//     }

//     // --- WebSocket Connections ---

//     const connectRecentChatsSocket = () => {
//         if (recentChatsSocket) recentChatsSocket.close();
//         clearTimeout(recentReconnectTimeout);

//         const wsUrl = `${wsProtocol}://${location.host}/ws/konnekt/r-chats/${currentUserID}/`;
//         recentChatsSocket = new WebSocket(wsUrl);

//         elements.recentChatsList.innerHTML = `<li class="text-center text-muted py-3">Fetching Conversations...</li>`;

//         recentChatsSocket.onopen = () => {
//             console.log("[RecentChats] Connected");
//             rcentReconnectAttempts = 0;
//         };

//         recentChatsSocket.onmessage = (event) => {
//             const data = JSON.parse(event.data);
//             console.log("data: ", data)
//             if (data.type === "recent_chats") renderRecentChats(data.recent_chats);
//         };

//         recentChatsSocket.onclose = () => {
//             console.warn("[RecentChats] Disconnected. Reconnecting...");
//             recentReconnectAttempts++;
//             const delay = exponentialBackoff(recentReconnectAttempts);
//             recentReconnectTimeout = setTimeout(connectRecentChatsSocket, delay);
//         };

//         recentChatsSocket.onerror = (error) => {
//             console.error("[RecentChats] WebSocket error:", error);
//         };
//     };

//     const connectChatSocket = () => {
//         if (chatSocket) chatSocket.close();
//         clearTimeout(chatReconnectTimeout);

//         const wsUrl = `${wsProtocol}://${location.host}/ws/konnekt/chat/${convoID}/`;
//         chatSocket = new WebSocket(wsUrl);

//         chatSocket.onopen = () => {
//             console.log("[Chat] Connected");
//             chatReconnectAttempts = 0;
//         };

//         chatSocket.onmessage = (event) => {
//             const data = JSON.parse(event.data);
//             if (data.type === "text_message") renderText(data);
//             if (data.type === "text_read_status") showReadMark(data);
//         };

//         chatSocket.onclose = () => {
//             chatReconnectAttempts++;
//             const delay = exponentialBackoff(chatReconnectAttempts);
//             chatReconnectTimeout = setTimeout(connectChatSocket, delay);
//         };

//         chatSocket.onerror = (error) => {
//             console.error("[Chat] websocket error: ", error);
//         }

//     };

//     const connectOnlineStatusSocket = () => {
//         if (onlineStatusSocket) onlineStatusSocket.close();
//         clearTimeout(statusReconnectTimeout);

//         const wsUrl = `${wsProtocol}://${location.host}/ws/konnekt/status/${currentUserID}/`;
//         onlineStatusSocket = new WebSocket(wsUrl);

//         onlineStatusSocket.onopen = () => {
//             console.log("[Status] Connected");
//             getInitialStatuses();
//             reconnectAttempts = 0;
//         };

//         onlineStatusSocket.onmessage = (event) => {
//             const data = JSON.parse(event.data);

//             if (data.type === "initial_statuses") {
//                 // data.statuses.forEach(status => {
//                 //     waitForElement(`status-${status.user_id}`, (el) => {
//                 //         console.log("status: ", status);
//                 //         if (status.status === "online") {
//                 //             el.style.display = "flex";
//                 //         } else {
//                 //             el.style.display = "none";
//                 //         }
//                 //     });
//                 // });

//                 initialChatIndicator(data);
//                 initialStatusIndicators(data);
//             }



//             if (data.type === "status_update") {
//                 // const el = document.getElementById(`status-${data.user_id}`);
//                 // if (!el) return;

//                 // if (data.status === "online") {
//                 //     el.style.display = "flex";
//                 // } else {
//                 //     el.style.display = "none";
//                 // }
//                 // statusUpdate(data);
//                 updateStatusIndicator(data);
//             }

//         };

//         onlineStatusSocket.onclose = () => {
//             statusReconnectAttempts++;
//             const delay = exponentialBackoff(statusReconnectAttempts);
//             statusReconnectTimeout = setTimeout(connectOnlineStatusSocket, delay);
//         };

//         onlineStatusSocket.onerror = (error) => {
//             console.error("[Status] websocket error: ", error);
//         }

//     };

//     if (elements.sendBtn) {
//         elements.sendBtn.addEventListener("click", async (e) => {
//             e.preventDefault();

//             const text = elements.msgBox.value.trim();
//             // const files = elements.imgBox.files;

//             if (text) {
//                 const data = JSON.stringify({
//                     type: "text_message",
//                     text: text,
//                     sender_id: currentUserID,
//                     c_id: convoID,
//                     timestamp: Date.now(),
//                 });

//                 chatSocket.send(data);
//                 console.log("data: ", data)
//             }
//             elements.msgBox.value = "";
//         });

//         elements.msgBox.addEventListener("keypress", function(e) {
//             if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 elements.sendBtn.click();
//             }
//         });
//     }

//     // --- Init ---
//     connectOnlineStatusSocket();
//     connectRecentChatsSocket();
//     connectChatSocket();
//     observeMessages();
// });
