// // /konnekt/sockets.js

// document.addEventListener("DOMContentLoaded", () => {
//     const currentUserID = window.currentUserID;
//     const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
//     const RECONNECT_DELAY = 5000; // Delay for reconnection attempts
//     let recentChatsSocket = null;
//     let recentChatsReconnectTimeout = null;

//     const recentChatsList = document.getElementById("recent-chats-list");

//     // Function to format time in a human-readable way
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
//             return dateString; // Return original string if parsing fails
//         }
//     };

//     // Function to render recent chats in the UI
//     const renderRecentChats = (chats) => {
//         const recentChatsList = document.getElementById("recent-chats-list");
//         if (!recentChatsList) return;

//         recentChatsList.innerHTML = chats.map(chat => {
//             const isGroup = chat.is_group;
//             const friend = chat.participants[0];
//             const avatar = friend.avatar_url;
//             const title = chat.title || friend.username;
//             const chatID = chat.c_id;
//             const lastMessage = chat.last_message || "No message yet";
//             const time = naturalTime(chat.timestamp) || "Just now";

//             return `
//             <li class="tyn-aside-item js-toggle-main">
//                 <a href="/konnekt/${chatID}/" class="tyn-media-group">
//                     <div class="tyn-media tyn-size-lg">
//                         <img src="${avatar}" alt="">
//                     </div>
//                     <div class="tyn-media-col">
//                         <div class="tyn-media-row">
//                             <h6 class="name">${title}</h6>
//                             <div class="indicator varified">
//                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16">
//                                     <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
//                                 </svg>
//                             </div>
//                         </div>
//                         <div class="tyn-media-row has-dot-sap">
//                             <p class="content">${lastMessage}</p>
//                             <span class="meta">${time}</span>
//                         </div>
//                     </div>
//                     <div class="tyn-media-option tyn-aside-item-option">
//                         <ul class="tyn-media-option-list">
//                             <li class="dropdown">
//                                 <button class="btn btn-icon btn-white btn-pill dropdown-toggle" data-bs-toggle="dropdown" data-bs-offset="0,0" data-bs-auto-close="outside">
//                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots" viewBox="0 0 16 16">
//                                         <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
//                                     </svg>
//                                 </button>
//                                 <div class="dropdown-menu dropdown-menu-end">
//                                     <ul class="tyn-list-links">
//                                         <li><a href="#"><span>Mark as Read</span></a></li>
//                                         <li><a href="#"><span>Mute Notifications</span></a></li>
//                                         <li><a href="contacts.html"><span>View Profile</span></a></li>
//                                         <li class="dropdown-divider"></li>
//                                         <li><a href="#"><span>Archive</span></a></li>
//                                         <li><a href="#deleteChat" data-bs-toggle="modal"><span>Delete</span></a></li>
//                                         <li><a href="#"><span>Report</span></a></li>
//                                     </ul>
//                                 </div>
//                             </li>
//                         </ul>
//                     </div>
//                 </a>
//             </li>
//             `;
//         }).join('');
//     };


//     // Function to connect to the recent chats WebSocket
//     const connectRecentChatsSocket = () => {
//         // Close existing socket if it exists
//         if (recentChatsSocket) {
//             recentChatsSocket.close();
//             clearTimeout(recentChatsReconnectTimeout);
//         }

//         const wsUrl = `${wsProtocol}://${window.location.host}/ws/konnekt/recent-chats/${currentUserID}/`;
//         recentChatsSocket = new WebSocket(wsUrl);

//         recentChatsSocket.onopen = () => {
//             console.log("Recent chats socket open.");
//         };

//         recentChatsSocket.onmessage = (event) => {
//             console.log("Message received:", event.data);
//             const chats = JSON.parse(event.data);
//             renderRecentChats(chats.recent_chats);
//         };

//         recentChatsSocket.onclose = (event) => {
//             console.log("Recent chats socket closed:", event);
//             recentChatsReconnectTimeout = setTimeout(connectRecentChatsSocket, RECONNECT_DELAY);
//         };

//         recentChatsSocket.onerror = (error) => {
//             console.error("WebSocket error:", error);
//         };
//     };

//     connectRecentChatsSocket();
// });






document.addEventListener("DOMContentLoaded", () => {
    const currentUserID = window.currentUserID;
    const convoID = window.convoID;
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const RECONNECT_DELAY = 5000;
    const MAX_RECONNECT_DELAY = 60000;

    let recentChatsSocket = null;
    let chatSocket = null;
    let reconnectAttempts = 0;
    let reconnectTimeout = null;

    const elements = {
        recentChatsList: document.getElementById("recent-chats-list"),
        msgForm: document.getElementById("msgForm"),
        msgBox: document.getElementById("msgBox"),
        sendBtn: document.getElementById("sendBtn"),
        chatItem: document.querySelectorAll(".tyn-reply-item"),
        chatBody: document.getElementById("tynChatBody"),
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

    function markAsRead(txtID, userID) {
        if (chatSocket.readyState !== WebSocket.OPEN) return;

        data = {
            type: "read_status",
            t_id: txtID,
            u_id: userID,
            timestamp: Date.now(),
        }

        chatSocket.send(JSON.stringify(data));
        console.log("msg: ", txtID);
        console.log("read by", userID);
    }


    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const msgID = entry.target.dataset.textId;
                markAsRead(msgID, currentUserID);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 1.0 });

    function observeMessages() {
        elements.chatItem.forEach(msg => {
            observer.observe(msg);
        });
    }


    // --- UI Rendering ---

    const renderRecentChats = (chats) => {
        const list = elements.recentChatsList;
        if (!Array.isArray(chats) || !list) return;

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
                <li class="tyn-aside-item js-toggle-main">
                    <a href="/konnekt/${chatID}/" class="tyn-media-group">
                        <div class="tyn-media tyn-size-lg">
                            <img src="${avatar}" alt="">
                        </div>
                        <div class="tyn-media-col">
                            <div class="tyn-media-row">
                                <h6 class="name">${title}</h6>
                                <div class="indicator varified">
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
                                            <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 
                                                1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 
                                                1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 
                                                1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
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
                    </a>
                </li>`;
            }).join('');
    };


    function renderText(data) {

        const isOutgoing = data.sender_id === currentUserID;
        const time = naturalTime(data.timestamp);
        const text = escapeHtml(data.text);
        const senderAvatar = window.senderAvatar;

        const html = isOutgoing
            ? `
            <div class="tyn-reply" id="tynReply">
                <div class="tyn-reply-item outgoing" data-text-id="${data.text_id}">
                    <div class="tyn-reply-group">
                        <div class="tyn-reply-bubble">
                            <div class="tyn-reply-text"> ${text} </div><!-- tyn-reply-text -->
                            <ul class="tyn-reply-tools">
                                <li>
                                    <button class="btn btn-icon btn-sm btn-transparent btn-pill">
                                        <!-- emoji-smile-fill -->
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-emoji-smile-fill" viewbox="0 0 16 16">
                                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5zM4.285 9.567a.5.5 0 0 1 .683.183A3.498 3.498 0 0 0 8 11.5a3.498 3.498 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.498 4.498 0 0 1 8 12.5a4.498 4.498 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683zM10 8c-.552 0-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5S10.552 8 10 8z"></path>
                                        </svg>
                                    </button>
                                </li><!-- li -->
                                <li class="dropup-center">
                                    <button class="btn btn-icon btn-sm btn-transparent btn-pill" data-bs-toggle="dropdown">
                                        <!-- three-dots -->
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots" viewbox="0 0 16 16">
                                            <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path>
                                        </svg>
                                    </button>
                                    <div class="dropdown-menu dropdown-menu-xxs">
                                        <ul class="tyn-list-links">
                                            <li>
                                                <a href="#">
                                                    <!-- pencil-square -->
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewbox="0 0 16 16">
                                                        <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"></path>
                                                        <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"></path>
                                                    </svg>
                                                    <span>Edit</span>
                                                </a>
                                            </li>
                                            <li>
                                                <a href="#">
                                                    <!-- trash -->
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
            </div>
            `
            : `
            <div class="tyn-reply" id="tynReply">
                <div class="tyn-reply-item incoming" data-text-id="${data.text_id}">
                    <div class="tyn-reply-avatar">
                        <div class="tyn-media tyn-size-md tyn-circle">
                            <img src="${senderAvatar}" alt="">
                        </div>
                    </div>
                    <div class="tyn-reply-group">
                        <div class="tyn-reply-bubble">
                            <div class="tyn-reply-text">
                                <div class="d-flex justify-content-between align-items-center">
                                    <small class="text-muted">${time}</small>
                                    <div class="indicator varified px-3">
                                        <!-- check-circle-fill -->
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" class="bi bi-check-circle-fill" viewbox="0 0 16 16">
                                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"></path>
                                        </svg>
                                    </div>
                                </div>
                                 ${text} </div>
                            <ul class="tyn-reply-tools">
                                <li>
                                    <button class="btn btn-icon btn-sm btn-transparent btn-pill">
                                        <!-- emoji-smile-fill -->
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-emoji-smile-fill" viewbox="0 0 16 16">
                                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5zM4.285 9.567a.5.5 0 0 1 .683.183A3.498 3.498 0 0 0 8 11.5a3.498 3.498 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.498 4.498 0 0 1 8 12.5a4.498 4.498 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683zM10 8c-.552 0-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5S10.552 8 10 8z"></path>
                                        </svg>
                                    </button>
                                </li><!-- li -->
                                <li class="dropup-center">
                                    <button class="btn btn-icon btn-sm btn-transparent btn-pill" data-bs-toggle="dropdown">
                                        <!-- three-dots -->
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots" viewbox="0 0 16 16">
                                            <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path>
                                        </svg>
                                    </button>
                                    <div class="dropdown-menu dropdown-menu-xxs">
                                        <ul class="tyn-list-links">
                                            <li>
                                                <a href="#">
                                                    <!-- pencil-square -->
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewbox="0 0 16 16">
                                                        <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"></path>
                                                        <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"></path>
                                                    </svg>
                                                    <span>Edit</span>
                                                </a>
                                            </li>
                                            <li>
                                                <a href="#">
                                                    <!-- trash -->
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
            </div>
            `;

        elements.chatBody.insertAdjacentHTML('beforeend', html);
        elements.chatBody.scrollTop = elements.chatBody.scrollHeight;
        observeMessages();
    }

    // --- WebSocket Connections ---

    const connectRecentChatsSocket = () => {
        if (recentChatsSocket) recentChatsSocket.close();
        clearTimeout(reconnectTimeout);

        const wsUrl = `${wsProtocol}://${location.host}/ws/konnekt/recent-chats/${currentUserID}/`;
        elements.recentChatsList.innerHTML = `<li class="text-center text-muted py-3">Loading recent chats...</li>`;
        recentChatsSocket = new WebSocket(wsUrl);

        recentChatsSocket.onopen = () => {
            console.log("[RecentChats] Connected");
            reconnectAttempts = 0;
        };

        recentChatsSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("rc: ", data);
            if (data.type === "recent_chats") renderRecentChats(data.recent_chats);
        };

        recentChatsSocket.onclose = () => {
            console.warn("[RecentChats] Disconnected. Reconnecting...");
            reconnectAttempts++;
            const delay = exponentialBackoff(reconnectAttempts);
            reconnectTimeout = setTimeout(connectRecentChatsSocket, delay);
        };

        recentChatsSocket.onerror = (error) => {
            console.error("[RecentChats] WebSocket error:", error);
        };
    };

    const connectChatSocket = () => {
        if (chatSocket) chatSocket.close();
        clearTimeout(reconnectTimeout);

        const wsUrl = `${wsProtocol}://${location.host}/ws/konnekt/chat/${convoID}/`;
        chatSocket = new WebSocket(wsUrl);

        chatSocket.onopen = () => {
            console.log("[Chat] Connected");
            reconnectAttempts = 0;
        };

        chatSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("new message: ", data);

            if (data.type === "text_message") renderText(data);
        };

        chatSocket.onclose = () => {
            reconnectAttempts++;
            const delay = exponentialBackoff(reconnectAttempts);
            reconnectTimeout = setTimeout(connectChatSocket, delay);
        };

        chatSocket.onerror = () => {
            // console.error("[Chat] websocket error: ", error);
        }

        // Add chatSocket message and close handlers here as needed
    };

    if (elements.sendBtn) {
        elements.sendBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            const text = elements.msgBox.value.trim();
            // const files = elements.imgBox.files;

            if (text) {
                data = JSON.stringify({
                    type: "text_message",
                    text: text,
                    sender_id: currentUserID,
                    c_id: convoID,
                    timestamp: Date.now(),
                });

                chatSocket.send(data);
                console.log("data: ", data)
            }
            elements.msgBox.value = "";
        });

        elements.msgBox.addEventListener("keypress", function(e) {
            if (e.key === "Enter" && !e.shiftkey) {
                e.preventDefault();
                elements.sendBtn.click();
            }
        });
    }

    // --- Init ---
    connectChatSocket();
    connectRecentChatsSocket();
    observeMessages();
});
