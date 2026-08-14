/**
 * ============================================================================
 * عائلة يحيي صبيح - Yahia Sobeih Family Real-time Chat Application
 * Pure Vanilla JavaScript (ES6+) with Firebase Realtime Database & Storage
 * ============================================================================
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. App State & Constants
  // --------------------------------------------------------------------------
  const STORAGE_KEYS = {
    USER_NAME: 'yahia_family_user_name',
    USER_AVATAR_COLOR: 'yahia_family_user_avatar_color',
    USER_AVATAR_IMAGE: 'yahia_family_user_avatar_image',
    FAMILY_AVATARS: 'yahia_family_members_avatars',
    FAMILY_MEMBERS: 'yahia_family_members_list',
    FB_CONFIG: 'yahia_family_firebase_config',
    MESSAGES_CACHE: 'yahia_family_cached_messages',
    PINNED_ANNOUNCEMENT: 'yahia_family_pinned_announcement',
    FAMILY_EVENTS: 'yahia_family_events_list',
    FAMILY_MEMORIES: 'yahia_family_memories_list',
    SOUND_ENABLED: 'yahia_family_sound_enabled',
    SYNC_ACTION: 'yahia_family_sync_action'
  };

  // Default Preset Family Members
  const DEFAULT_FAMILY_MEMBERS = [
    'يحيي صبيح (الوالد)',
    'أم محمد (الوالدة)',
    'محمد يحيي صبيح',
    'أحمد يحيي صبيح',
    'محمود يحيي صبيح',
    'سارة يحيي صبيح',
    'فاطمة يحيي صبيح'
  ];

  // Preset Avatar Colors for Family Members
  const AVATAR_COLORS = [
    'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
  ];

  // Preset Curated Illustrated Family Avatars (SVG/Emoji badges)
  const PRESET_ILLUSTRATED_AVATARS = [
    { id: 'dad', emoji: '👨‍💼', label: 'الوالد الوقور', bg: '#0284c7' },
    { id: 'mom', emoji: '🧕', label: 'الوالدة الحنونة', bg: '#ec4899' },
    { id: 'grandpa', emoji: '👴', label: 'الجد الحكيم', bg: '#d97706' },
    { id: 'grandma', emoji: '👵', label: 'الجدة الطيبة', bg: '#8b5cf6' },
    { id: 'young_man', emoji: '👨‍💻', label: 'شاب / مهندس', bg: '#06b6d4' },
    { id: 'young_lady', emoji: '👩‍🎓', label: 'فتاة / خريجة', bg: '#10b981' },
    { id: 'boy', emoji: '👦', label: 'فتى العائلة', bg: '#3b82f6' },
    { id: 'girl', emoji: '👧', label: 'أميرة العائلة', bg: '#f43f5e' },
    { id: 'baby', emoji: '👶', label: 'أصغر العائلة', bg: '#fbbf24' },
    { id: 'crown', emoji: '👑', label: 'تاج الأسرة', bg: '#eab308' },
    { id: 'rose', emoji: '🌸', label: 'وردة الدار', bg: '#f472b6' },
    { id: 'star', emoji: '⭐', label: 'نجم العائلة', bg: '#6366f1' }
  ];

  // Application State Object
  const state = {
    currentUser: '',
    currentAvatarColor: '',
    currentUserAvatar: '', // Data URL or Preset Avatar
    tempSelectedAvatar: '', // Working avatar in modal
    familyAvatars: {}, // Mapping: { [memberName]: avatarDataUrl }
    familyMembers: [],
    messages: [],
    pinnedAnnouncement: null, // { title, text, sender, timestamp }
    familyEvents: [], // [{ id, title, date, category, member, notes }]
    familyMemories: [], // [{ id, caption, category, imageUrl, sender, timestamp }]
    currentAlbumFilter: 'all',
    activeAudioPlayer: null, // Track currently playing waveform player instance
    lightboxImages: [], // Gallery images for slideshow navigation
    lightboxCurrentIndex: 0,
    pendingAttachment: null, // { file, type, dataUrl, name, size }
    mediaRecorder: null,
    audioChunks: [],
    recordStartTime: 0,
    recordTimerInterval: null,
    isRecording: false,
    selectedDeleteId: null,
    searchQuery: '',
    soundEnabled: true,
    deferredInstallPrompt: null,
    isFirebaseReady: false,
    dbRef: null,
    announcementDbRef: null,
    eventsDbRef: null,
    storageRef: null,
    broadcastChannel: null,
    cameraStream: null,
    cameraFacingMode: 'user',
    capturedPhotoData: null
  };

  // --------------------------------------------------------------------------
  // 2. DOM Elements Cache
  // --------------------------------------------------------------------------
  const DOM = {
    // Header & User
    headerUserName: document.getElementById('headerUserName'),
    headerUserAvatar: document.getElementById('headerUserAvatar'),
    userProfileBtn: document.getElementById('userProfileBtn'),
    pinnedAnnouncementBtn: document.getElementById('pinnedAnnouncementBtn'),
    pinnedBadgeDot: document.getElementById('pinnedBadgeDot'),
    familyCalendarBtn: document.getElementById('familyCalendarBtn'),
    eventsCountBadge: document.getElementById('eventsCountBadge'),
    familyRosterBtn: document.getElementById('familyRosterBtn'),
    networkStatusBadge: document.getElementById('networkStatusBadge'),
    networkStatusText: document.getElementById('networkStatusText'),
    searchToggleBtn: document.getElementById('searchToggleBtn'),
    mediaGalleryBtn: document.getElementById('mediaGalleryBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    pwaInstallBtn: document.getElementById('pwaInstallBtn'),
    pwaBanner: document.getElementById('pwaBanner'),
    pwaBannerInstallBtn: document.getElementById('pwaBannerInstallBtn'),
    pwaBannerDismissBtn: document.getElementById('pwaBannerDismissBtn'),

    // Top Pinned Announcement Banner
    pinnedAnnouncementBanner: document.getElementById('pinnedAnnouncementBanner'),
    pinnedTitle: document.getElementById('pinnedTitle'),
    pinnedSender: document.getElementById('pinnedSender'),
    pinnedText: document.getElementById('pinnedText'),
    editAnnouncementBtn: document.getElementById('editAnnouncementBtn'),
    togglePinnedBannerBtn: document.getElementById('togglePinnedBannerBtn'),

    // Search Bar
    searchBarContainer: document.getElementById('searchBarContainer'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    searchResultsCount: document.getElementById('searchResultsCount'),

    // Main Chat Stream & Navigation
    chatMain: document.getElementById('chatMain'),
    messagesStream: document.getElementById('messagesStream'),
    familyWelcomeCard: document.getElementById('familyWelcomeCard'),
    chatNavControls: document.getElementById('chatNavControls'),
    scrollToTopBtn: document.getElementById('scrollToTopBtn'),
    scrollStepUpBtn: document.getElementById('scrollStepUpBtn'),
    scrollStepDownBtn: document.getElementById('scrollStepDownBtn'),
    scrollToBottomBtn: document.getElementById('scrollToBottomBtn'),
    unreadCountBadge: document.getElementById('unreadCountBadge'),
    quickGreetingPills: document.getElementById('quickGreetingPills'),

    // Progress & Preview
    uploadProgressBarContainer: document.getElementById('uploadProgressBarContainer'),
    uploadProgressBar: document.getElementById('uploadProgressBar'),
    uploadStatusText: document.getElementById('uploadStatusText'),
    uploadPercentText: document.getElementById('uploadPercentText'),
    attachmentPreviewBar: document.getElementById('attachmentPreviewBar'),
    previewThumbnail: document.getElementById('previewThumbnail'),
    previewFilename: document.getElementById('previewFilename'),
    previewFilesize: document.getElementById('previewFilesize'),
    cancelAttachmentBtn: document.getElementById('cancelAttachmentBtn'),

    // Emoji Bar
    quickEmojiBar: document.getElementById('quickEmojiBar'),

    // Footer & Input Form
    messageForm: document.getElementById('messageForm'),
    messageInput: document.getElementById('messageInput'),
    fileInput: document.getElementById('fileInput'),
    cameraInput: document.getElementById('cameraInput'),
    createPollBtn: document.getElementById('createPollBtn'),
    recordVoiceBtn: document.getElementById('recordVoiceBtn'),
    sendBtn: document.getElementById('sendBtn'),
    audioRecordingBar: document.getElementById('audioRecordingBar'),
    recordingTimer: document.getElementById('recordingTimer'),
    cancelRecordBtn: document.getElementById('cancelRecordBtn'),
    sendRecordBtn: document.getElementById('sendRecordBtn'),

    // Modals - User & Avatars
    userNameModal: document.getElementById('userNameModal'),
    closeUserModalBtn: document.getElementById('closeUserModalBtn'),
    memberPresetGrid: document.getElementById('memberPresetGrid'),
    openBulkFromUserModalBtn: document.getElementById('openBulkFromUserModalBtn'),
    customNameInput: document.getElementById('customNameInput'),
    saveUserNameBtn: document.getElementById('saveUserNameBtn'),

    // Avatar Customizer in User Modal
    userModalAvatarPreview: document.getElementById('userModalAvatarPreview'),
    userModalAvatarInitial: document.getElementById('userModalAvatarInitial'),
    userModalAvatarImg: document.getElementById('userModalAvatarImg'),
    uploadAvatarBtn: document.getElementById('uploadAvatarBtn'),
    openCameraAvatarBtn: document.getElementById('openCameraAvatarBtn'),
    togglePresetAvatarsBtn: document.getElementById('togglePresetAvatarsBtn'),
    removeAvatarBtn: document.getElementById('removeAvatarBtn'),
    avatarFileInput: document.getElementById('avatarFileInput'),
    avatarCameraInput: document.getElementById('avatarCameraInput'),
    presetAvatarsDrawer: document.getElementById('presetAvatarsDrawer'),
    closePresetAvatarsBtn: document.getElementById('closePresetAvatarsBtn'),
    presetAvatarsGrid: document.getElementById('presetAvatarsGrid'),

    // Live Camera Snapshot Modal
    cameraSnapshotModal: document.getElementById('cameraSnapshotModal'),
    closeCameraModalBtn: document.getElementById('closeCameraModalBtn'),
    cameraVideo: document.getElementById('cameraVideo'),
    cameraCapturedImg: document.getElementById('cameraCapturedImg'),
    cameraGuideRing: document.getElementById('cameraGuideRing'),
    cameraFlashFx: document.getElementById('cameraFlashFx'),
    cameraCanvas: document.getElementById('cameraCanvas'),
    switchCameraFacingBtn: document.getElementById('switchCameraFacingBtn'),
    cameraStatusLabel: document.getElementById('cameraStatusLabel'),
    cameraBeforeCaptureControls: document.getElementById('cameraBeforeCaptureControls'),
    cameraAfterCaptureControls: document.getElementById('cameraAfterCaptureControls'),
    snapPhotoBtn: document.getElementById('snapPhotoBtn'),
    cancelCameraBtn: document.getElementById('cancelCameraBtn'),
    useCapturedPhotoBtn: document.getElementById('useCapturedPhotoBtn'),
    retakePhotoBtn: document.getElementById('retakePhotoBtn'),

    // Bulk Family Members Modal
    bulkMembersModal: document.getElementById('bulkMembersModal'),
    closeBulkModalBtn: document.getElementById('closeBulkModalBtn'),
    cancelBulkModalBtn: document.getElementById('cancelBulkModalBtn'),
    bulkNamesTextarea: document.getElementById('bulkNamesTextarea'),
    bulkDetectedCount: document.getElementById('bulkDetectedCount'),
    previewBadgesCount: document.getElementById('previewBadgesCount'),
    bulkNamesPreviewGrid: document.getElementById('bulkNamesPreviewGrid'),
    loadSampleNamesBtn: document.getElementById('loadSampleNamesBtn'),
    clearBulkInputBtn: document.getElementById('clearBulkInputBtn'),
    saveBulkNamesBtn: document.getElementById('saveBulkNamesBtn'),

    // Delete Modal
    deleteModal: document.getElementById('deleteModal'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    deleteMsgAvatar: document.getElementById('deleteMsgAvatar'),
    deleteMsgSender: document.getElementById('deleteMsgSender'),
    deleteMsgTime: document.getElementById('deleteMsgTime'),
    deleteMessagePreview: document.getElementById('deleteMessagePreview'),
    deleteSafetyCheck: document.getElementById('deleteSafetyCheck'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),

    // Lightbox Modal & Slideshow
    lightboxModal: document.getElementById('lightboxModal'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxSender: document.getElementById('lightboxSender'),
    lightboxTime: document.getElementById('lightboxTime'),
    lightboxDownloadBtn: document.getElementById('lightboxDownloadBtn'),
    closeLightboxBtn: document.getElementById('closeLightboxBtn'),
    lightboxPrevBtn: document.getElementById('lightboxPrevBtn'),
    lightboxNextBtn: document.getElementById('lightboxNextBtn'),

    // Media Gallery & Family Albums Modal
    mediaGalleryModal: document.getElementById('mediaGalleryModal'),
    closeGalleryModalBtn: document.getElementById('closeGalleryModalBtn'),
    galleryGrid: document.getElementById('galleryGrid'),
    galleryImgCount: document.getElementById('galleryImgCount'),
    galleryAlbumCount: document.getElementById('galleryAlbumCount'),
    galleryVidCount: document.getElementById('galleryVidCount'),
    galleryAudCount: document.getElementById('galleryAudCount'),
    galleryLinkCount: document.getElementById('galleryLinkCount'),
    albumFilterBar: document.getElementById('albumFilterBar'),
    openAddMemoryModalBtn: document.getElementById('openAddMemoryModalBtn'),

    // Add Memory Modal
    addMemoryModal: document.getElementById('addMemoryModal'),
    closeAddMemoryModalBtn: document.getElementById('closeAddMemoryModalBtn'),
    memoryAlbumCategory: document.getElementById('memoryAlbumCategory'),
    memoryCaptionInput: document.getElementById('memoryCaptionInput'),
    memoryDropzone: document.getElementById('memoryDropzone'),
    memoryPreviewImg: document.getElementById('memoryPreviewImg'),
    memoryFileInput: document.getElementById('memoryFileInput'),
    saveMemoryBtn: document.getElementById('saveMemoryBtn'),

    // Pinned Announcement Modal
    announcementModal: document.getElementById('announcementModal'),
    closeAnnouncementModalBtn: document.getElementById('closeAnnouncementModalBtn'),
    announcementTitleInput: document.getElementById('announcementTitleInput'),
    announcementTextInput: document.getElementById('announcementTextInput'),
    unpinAnnouncementBtn: document.getElementById('unpinAnnouncementBtn'),
    saveAnnouncementBtn: document.getElementById('saveAnnouncementBtn'),

    // Family Calendar & Events Modal
    eventsCalendarModal: document.getElementById('eventsCalendarModal'),
    closeEventsModalBtn: document.getElementById('closeEventsModalBtn'),
    upcomingEventsCount: document.getElementById('upcomingEventsCount'),
    toggleAddEventFormBtn: document.getElementById('toggleAddEventFormBtn'),
    addEventFormCard: document.getElementById('addEventFormCard'),
    eventCategorySelect: document.getElementById('eventCategorySelect'),
    eventTitleInput: document.getElementById('eventTitleInput'),
    eventDateInput: document.getElementById('eventDateInput'),
    eventMemberInput: document.getElementById('eventMemberInput'),
    eventNotesInput: document.getElementById('eventNotesInput'),
    saveNewEventBtn: document.getElementById('saveNewEventBtn'),
    cancelAddEventBtn: document.getElementById('cancelAddEventBtn'),
    eventsListContainer: document.getElementById('eventsListContainer'),

    // Family Poll Create Modal
    pollCreateModal: document.getElementById('pollCreateModal'),
    closePollModalBtn: document.getElementById('closePollModalBtn'),
    pollQuestionInput: document.getElementById('pollQuestionInput'),
    pollOptionsList: document.getElementById('pollOptionsList'),
    addPollOptionBtn: document.getElementById('addPollOptionBtn'),
    pollMultiChoice: document.getElementById('pollMultiChoice'),
    submitPollBtn: document.getElementById('submitPollBtn'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
    settingsCurrentName: document.getElementById('settingsCurrentName'),
    settingsChangeNameBtn: document.getElementById('settingsChangeNameBtn'),
    settingsFamilyCount: document.getElementById('settingsFamilyCount'),
    settingsManageBulkBtn: document.getElementById('settingsManageBulkBtn'),
    fbApiKey: document.getElementById('fbApiKey'),
    fbDbUrl: document.getElementById('fbDbUrl'),
    fbStorageBucket: document.getElementById('fbStorageBucket'),
    fbProjectId: document.getElementById('fbProjectId'),
    saveFbConfigBtn: document.getElementById('saveFbConfigBtn'),
    resetFbConfigBtn: document.getElementById('resetFbConfigBtn'),
    soundToggle: document.getElementById('soundToggle')
  };

  // --------------------------------------------------------------------------
  // In-App Toast Feedback Notification Helper
  // --------------------------------------------------------------------------
  function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('appToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'appToastContainer';
      container.className = 'toast-notification-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;

    let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
    else if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i>';

    toast.innerHTML = `${icon} <span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // --------------------------------------------------------------------------
  // 3. User Identification & Family Roster Management
  // --------------------------------------------------------------------------
  function initUserSession() {
    loadFamilyMembers();
    loadFamilyAvatars();

    const savedName = localStorage.getItem(STORAGE_KEYS.USER_NAME);
    const savedColor = localStorage.getItem(STORAGE_KEYS.USER_AVATAR_COLOR);
    const savedAvatar = localStorage.getItem(STORAGE_KEYS.USER_AVATAR_IMAGE);

    if (savedName && savedName.trim()) {
      state.currentUser = savedName.trim();
      state.currentAvatarColor = savedColor || getAvatarColor(savedName);
      state.currentUserAvatar = savedAvatar || state.familyAvatars[state.currentUser] || '';
      updateHeaderUserUI();
    } else {
      showUserSelectionModal(false);
    }
  }

  function loadFamilyAvatars() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAMILY_AVATARS);
      if (stored) {
        state.familyAvatars = JSON.parse(stored) || {};
      } else {
        state.familyAvatars = {};
      }
    } catch (e) {
      state.familyAvatars = {};
    }
  }

  function getMemberAvatar(name) {
    if (!name) return '';
    if (state.familyAvatars && state.familyAvatars[name]) {
      return state.familyAvatars[name];
    }
    if (state.currentUser === name && state.currentUserAvatar) {
      return state.currentUserAvatar;
    }
    return '';
  }

  function saveMemberAvatar(name, avatarUrl) {
    if (!name) return;
    if (!state.familyAvatars) state.familyAvatars = {};

    if (avatarUrl) {
      state.familyAvatars[name] = avatarUrl;
    } else {
      delete state.familyAvatars[name];
    }

    try {
      localStorage.setItem(STORAGE_KEYS.FAMILY_AVATARS, JSON.stringify(state.familyAvatars));
    } catch (e) {
      console.warn('LocalStorage quota notice:', e);
    }

    if (state.currentUser === name) {
      state.currentUserAvatar = avatarUrl || '';
      if (avatarUrl) {
        localStorage.setItem(STORAGE_KEYS.USER_AVATAR_IMAGE, avatarUrl);
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER_AVATAR_IMAGE);
      }
      updateHeaderUserUI();
    }

    renderMemberPresetGrid();
    renderMessages();
  }

  function compressAndCropSquareImage(fileOrDataUrl, maxDim = 180, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxDim;
        canvas.height = maxDim;
        const ctx = canvas.getContext('2d');

        // Calculate center square crop
        const minSide = Math.min(img.width, img.height);
        const startX = (img.width - minSide) / 2;
        const startY = (img.height - minSide) / 2;

        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, maxDim, maxDim);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);

      if (typeof fileOrDataUrl === 'string') {
        img.src = fileOrDataUrl;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(fileOrDataUrl);
      }
    });
  }

  function updateAvatarPreviewUI(avatarUrl, name) {
    const activeName = name || (DOM.customNameInput ? DOM.customNameInput.value : state.currentUser) || 'ي';
    if (avatarUrl) {
      DOM.userModalAvatarImg.src = avatarUrl;
      DOM.userModalAvatarImg.style.display = 'block';
      DOM.userModalAvatarInitial.style.display = 'none';
      DOM.userModalAvatarPreview.style.background = 'transparent';
      DOM.removeAvatarBtn.style.display = 'inline-flex';
    } else {
      DOM.userModalAvatarImg.src = '';
      DOM.userModalAvatarImg.style.display = 'none';
      DOM.userModalAvatarInitial.style.display = 'block';
      DOM.userModalAvatarInitial.textContent = getInitials(activeName);
      DOM.userModalAvatarPreview.style.background = getAvatarColor(activeName);
      DOM.removeAvatarBtn.style.display = 'none';
    }
  }

  function renderPresetAvatarsDrawer() {
    if (!DOM.presetAvatarsGrid) return;
    DOM.presetAvatarsGrid.innerHTML = '';

    PRESET_ILLUSTRATED_AVATARS.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-avatar-btn';
      btn.title = item.label;
      btn.style.background = item.bg;
      btn.textContent = item.emoji;

      btn.addEventListener('click', async () => {
        DOM.presetAvatarsGrid.querySelectorAll('.preset-avatar-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // Create high-res circular canvas badge for the emoji avatar
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');

        // Background Circle
        ctx.fillStyle = item.bg;
        ctx.beginPath();
        ctx.arc(90, 90, 90, 0, Math.PI * 2);
        ctx.fill();

        // Emoji
        ctx.font = '84px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.emoji, 90, 96);

        const dataUrl = canvas.toDataURL('image/png');
        state.tempSelectedAvatar = dataUrl;
        updateAvatarPreviewUI(dataUrl, DOM.customNameInput ? DOM.customNameInput.value : state.currentUser);
        if (DOM.presetAvatarsDrawer) DOM.presetAvatarsDrawer.style.display = 'none';
      });

      DOM.presetAvatarsGrid.appendChild(btn);
    });
  }

  // --------------------------------------------------------------------------
  // Camera Snapshot Engine
  // --------------------------------------------------------------------------
  async function openCameraSnapshotModal() {
    if (DOM.cameraSnapshotModal) {
      DOM.cameraSnapshotModal.style.display = 'flex';
      DOM.cameraBeforeCaptureControls.style.display = 'flex';
      DOM.cameraAfterCaptureControls.style.display = 'none';
      DOM.cameraCapturedImg.style.display = 'none';
      DOM.cameraVideo.style.display = 'block';
      if (DOM.cameraGuideRing) DOM.cameraGuideRing.style.display = 'block';
      if (DOM.cameraStatusLabel) DOM.cameraStatusLabel.textContent = 'جاري تشغيل الكاميرا...';
      await startCameraStream();
    }
  }

  function closeCameraSnapshotModal() {
    stopCameraStream();
    if (DOM.cameraSnapshotModal) {
      DOM.cameraSnapshotModal.style.display = 'none';
    }
  }

  async function startCameraStream() {
    stopCameraStream();
    try {
      const constraints = {
        video: {
          facingMode: state.cameraFacingMode,
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      };

      state.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (DOM.cameraVideo) {
        DOM.cameraVideo.srcObject = state.cameraStream;
        DOM.cameraVideo.play().catch(e => console.warn('Video play notice:', e));
      }
      if (DOM.cameraStatusLabel) DOM.cameraStatusLabel.textContent = 'الكاميرا جاهزة للالتقاط';
    } catch (err) {
      console.warn('Camera access issue:', err);
      if (DOM.cameraStatusLabel) DOM.cameraStatusLabel.textContent = 'تعذر تشغيل الكاميرا المباشرة، يمكنك استخدام زر رفع صورة أو كاميرا الهاتف.';
      // Trigger mobile camera fallback input if direct stream is not allowed in iframe
      if (DOM.avatarCameraInput) {
        DOM.avatarCameraInput.click();
        closeCameraSnapshotModal();
      }
    }
  }

  function stopCameraStream() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(track => track.stop());
      state.cameraStream = null;
    }
    if (DOM.cameraVideo) {
      DOM.cameraVideo.srcObject = null;
    }
  }

  async function snapPhoto() {
    if (!DOM.cameraVideo) return;

    // Trigger flash animation
    if (DOM.cameraFlashFx) {
      DOM.cameraFlashFx.classList.add('flash-active');
      setTimeout(() => DOM.cameraFlashFx.classList.remove('flash-active'), 200);
    }

    try {
      const video = DOM.cameraVideo;
      const vWidth = video.videoWidth || 480;
      const vHeight = video.videoHeight || 480;

      const canvas = DOM.cameraCanvas || document.createElement('canvas');
      const targetDim = 240;
      canvas.width = targetDim;
      canvas.height = targetDim;
      const ctx = canvas.getContext('2d');

      const minSide = Math.min(vWidth, vHeight);
      const startX = (vWidth - minSide) / 2;
      const startY = (vHeight - minSide) / 2;

      ctx.drawImage(video, startX, startY, minSide, minSide, 0, 0, targetDim, targetDim);
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.88);

      state.capturedPhotoData = photoDataUrl;
      DOM.cameraCapturedImg.src = photoDataUrl;
      DOM.cameraCapturedImg.style.display = 'block';
      DOM.cameraVideo.style.display = 'none';
      if (DOM.cameraGuideRing) DOM.cameraGuideRing.style.display = 'none';

      DOM.cameraBeforeCaptureControls.style.display = 'none';
      DOM.cameraAfterCaptureControls.style.display = 'flex';
      if (DOM.cameraStatusLabel) DOM.cameraStatusLabel.textContent = 'تم التقاط الصورة، هل تريد اعتمادها؟';
    } catch (e) {
      console.warn('Snap photo error:', e);
    }
  }

  function retakePhoto() {
    state.capturedPhotoData = null;
    DOM.cameraCapturedImg.style.display = 'none';
    DOM.cameraVideo.style.display = 'block';
    if (DOM.cameraGuideRing) DOM.cameraGuideRing.style.display = 'block';
    DOM.cameraBeforeCaptureControls.style.display = 'flex';
    DOM.cameraAfterCaptureControls.style.display = 'none';
    if (DOM.cameraStatusLabel) DOM.cameraStatusLabel.textContent = 'الكاميرا جاهزة للالتقاط';
  }

  function useCapturedPhoto() {
    if (!state.capturedPhotoData) return;
    state.tempSelectedAvatar = state.capturedPhotoData;
    updateAvatarPreviewUI(state.capturedPhotoData, DOM.customNameInput ? DOM.customNameInput.value : state.currentUser);
    closeCameraSnapshotModal();
  }

  async function switchCameraFacing() {
    state.cameraFacingMode = state.cameraFacingMode === 'user' ? 'environment' : 'user';
    await startCameraStream();
  }

  function loadFamilyMembers() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.familyMembers = parsed.map(n => String(n).trim()).filter(Boolean);
        } else {
          state.familyMembers = [...DEFAULT_FAMILY_MEMBERS];
        }
      } else {
        state.familyMembers = [...DEFAULT_FAMILY_MEMBERS];
        localStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(state.familyMembers));
      }
    } catch (e) {
      state.familyMembers = [...DEFAULT_FAMILY_MEMBERS];
    }
    updateFamilyCountUI();
    renderMemberPresetGrid();
  }

  function updateFamilyCountUI() {
    const count = state.familyMembers.length;
    if (DOM.settingsFamilyCount) {
      DOM.settingsFamilyCount.textContent = `${count} ${count === 1 ? 'فرد' : 'أفراد'}`;
    }
  }

  function renderMemberPresetGrid() {
    if (!DOM.memberPresetGrid) return;
    DOM.memberPresetGrid.innerHTML = '';

    if (!state.familyMembers || state.familyMembers.length === 0) {
      DOM.memberPresetGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 12px; color: var(--text-muted); font-size: 0.82rem;">
          لا توجد أسماء مسجلة حالياً. اضغط "إدخال الكل دفعة واحدة" لإضافة أفراد العائلة.
        </div>
      `;
      return;
    }

    state.familyMembers.forEach(memberName => {
      const card = document.createElement('div');
      card.className = 'member-chip-card';
      if (state.currentUser && state.currentUser.trim() === memberName.trim()) {
        card.classList.add('active');
      }

      const avatar = document.createElement('div');
      avatar.className = 'member-chip-avatar';
      const memberPhoto = getMemberAvatar(memberName);
      if (memberPhoto) {
        avatar.innerHTML = `<img src="${memberPhoto}" alt="${escapeHTML(memberName)}">`;
        avatar.style.background = 'transparent';
      } else {
        avatar.style.background = getAvatarColor(memberName);
        avatar.textContent = getInitials(memberName);
      }

      const nameSpan = document.createElement('span');
      nameSpan.className = 'member-chip-name';
      nameSpan.textContent = memberName;
      nameSpan.title = memberName;

      card.appendChild(avatar);
      card.appendChild(nameSpan);

      // Single click: select name into custom input and load their avatar preview
      card.addEventListener('click', () => {
        DOM.memberPresetGrid.querySelectorAll('.member-chip-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        if (DOM.customNameInput) {
          DOM.customNameInput.value = memberName;
        }
        const memberAvatar = getMemberAvatar(memberName);
        state.tempSelectedAvatar = memberAvatar;
        updateAvatarPreviewUI(memberAvatar, memberName);
      });

      // Double click: directly save this user
      card.addEventListener('dblclick', () => {
        saveUserName(memberName);
      });

      DOM.memberPresetGrid.appendChild(card);
    });
  }

  function parseBulkNames(text) {
    if (!text) return [];
    const rawTokens = text.split(/[\n\r,،;]+/);
    const seen = new Set();
    const result = [];

    for (const raw of rawTokens) {
      const cleaned = raw.trim();
      if (cleaned && !seen.has(cleaned.toLowerCase())) {
        seen.add(cleaned.toLowerCase());
        result.push(cleaned);
      }
    }
    return result;
  }

  function updateBulkPreviewFromInput() {
    if (!DOM.bulkNamesTextarea) return;
    const names = parseBulkNames(DOM.bulkNamesTextarea.value);

    if (DOM.bulkDetectedCount) {
      DOM.bulkDetectedCount.textContent = names.length;
    }
    if (DOM.previewBadgesCount) {
      DOM.previewBadgesCount.textContent = names.length;
    }

    if (!DOM.bulkNamesPreviewGrid) return;
    DOM.bulkNamesPreviewGrid.innerHTML = '';

    if (names.length === 0) {
      DOM.bulkNamesPreviewGrid.innerHTML = `
        <span style="color: var(--text-dim); font-size: 0.8rem; padding: 6px 8px;">
          اكتب أو الصق الأسماء في المربع أعلاه لتظهر المعاينة هنا...
        </span>
      `;
      return;
    }

    names.forEach(name => {
      const badge = document.createElement('div');
      badge.className = 'bulk-preview-badge';

      const avatar = document.createElement('div');
      avatar.className = 'bulk-preview-avatar';
      avatar.style.background = getAvatarColor(name);
      avatar.textContent = getInitials(name);

      const label = document.createElement('span');
      label.textContent = name;

      badge.appendChild(avatar);
      badge.appendChild(label);
      DOM.bulkNamesPreviewGrid.appendChild(badge);
    });
  }

  function openBulkMembersModal() {
    hideUserSelectionModal();
    if (DOM.settingsModal) DOM.settingsModal.style.display = 'none';

    if (DOM.bulkMembersModal) {
      DOM.bulkMembersModal.style.display = 'flex';
      if (DOM.bulkNamesTextarea) {
        DOM.bulkNamesTextarea.value = state.familyMembers.join('\n');
        updateBulkPreviewFromInput();
        setTimeout(() => {
          DOM.bulkNamesTextarea.focus();
        }, 100);
      }
    }
  }

  function hideBulkMembersModal() {
    if (DOM.bulkMembersModal) {
      DOM.bulkMembersModal.style.display = 'none';
    }
  }

  function saveBulkNames() {
    if (!DOM.bulkNamesTextarea) return;
    const names = parseBulkNames(DOM.bulkNamesTextarea.value);

    if (names.length === 0) {
      alert('الرجاء كتابة أو لصق اسم واحد على الأقل من أفراد العائلة.');
      DOM.bulkNamesTextarea.focus();
      return;
    }

    state.familyMembers = names;
    localStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(names));

    updateFamilyCountUI();
    renderMemberPresetGrid();
    hideBulkMembersModal();

    // Re-open user selection modal so they can choose their name from the new list
    showUserSelectionModal(true);
  }

  function loadSampleFamilyNames() {
    if (!DOM.bulkNamesTextarea) return;
    const sample = [
      'يحيي صبيح (الوالد)',
      'أم محمد (الوالدة)',
      'محمد يحيي صبيح',
      'أحمد يحيي صبيح',
      'محمود يحيي صبيح',
      'سارة يحيي صبيح',
      'فاطمة يحيي صبيح',
      'نور يحيي صبيح',
      'خالد يحيي صبيح'
    ].join('\n');

    DOM.bulkNamesTextarea.value = sample;
    updateBulkPreviewFromInput();
  }

  function updateHeaderUserUI() {
    if (!state.currentUser) return;
    DOM.headerUserName.textContent = state.currentUser;
    
    const avatarUrl = state.currentUserAvatar || getMemberAvatar(state.currentUser);
    if (avatarUrl) {
      DOM.headerUserAvatar.innerHTML = `<img src="${avatarUrl}" alt="${escapeHTML(state.currentUser)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;
      DOM.headerUserAvatar.style.background = 'transparent';
    } else {
      DOM.headerUserAvatar.innerHTML = '';
      DOM.headerUserAvatar.textContent = getInitials(state.currentUser);
      DOM.headerUserAvatar.style.background = state.currentAvatarColor || getAvatarColor(state.currentUser);
    }

    if (DOM.settingsCurrentName) {
      DOM.settingsCurrentName.textContent = state.currentUser;
    }
  }

  function showUserSelectionModal(canClose = true) {
    DOM.userNameModal.style.display = 'flex';
    DOM.customNameInput.value = state.currentUser || '';
    DOM.closeUserModalBtn.style.display = canClose ? 'block' : 'none';
    
    // Set temporary selected avatar from current user or member avatar
    state.tempSelectedAvatar = state.currentUserAvatar || getMemberAvatar(state.currentUser) || '';
    updateAvatarPreviewUI(state.tempSelectedAvatar, state.currentUser);
    
    renderPresetAvatarsDrawer();
    renderMemberPresetGrid();
    
    setTimeout(() => {
      if (DOM.customNameInput) {
        DOM.customNameInput.focus();
        DOM.customNameInput.select();
      }
    }, 100);
  }

  function hideUserSelectionModal() {
    DOM.userNameModal.style.display = 'none';
    if (DOM.presetAvatarsDrawer) {
      DOM.presetAvatarsDrawer.style.display = 'none';
    }
  }

  function saveUserName(name) {
    const cleanName = (name || (DOM.customNameInput ? DOM.customNameInput.value : '')).trim();
    if (!cleanName) {
      alert('الرجاء اختيار اسم من القائمة أو كتابة اسمك الكريم للمتابعة.');
      if (DOM.customNameInput) DOM.customNameInput.focus();
      return;
    }

    state.currentUser = cleanName;
    state.currentAvatarColor = getAvatarColor(cleanName);

    localStorage.setItem(STORAGE_KEYS.USER_NAME, state.currentUser);
    localStorage.setItem(STORAGE_KEYS.USER_AVATAR_COLOR, state.currentAvatarColor);

    // Save customized avatar for this member
    saveMemberAvatar(cleanName, state.tempSelectedAvatar);

    // If new name not in family list, optionally add it
    if (!state.familyMembers.some(m => m.toLowerCase() === cleanName.toLowerCase())) {
      state.familyMembers.push(cleanName);
      localStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(state.familyMembers));
      updateFamilyCountUI();
    }

    renderMemberPresetGrid();
    updateHeaderUserUI();
    hideUserSelectionModal();
    renderMessages();

    // If the user had typed a message before picking their name, send it automatically!
    if ((DOM.messageInput.value && DOM.messageInput.value.trim()) || state.pendingAttachment) {
      sendMessage();
    }
  }

  function getInitials(name) {
    if (!name) return 'ص';
    const cleaned = name.replace(/👑|🌸|👨‍💼|👨‍💻|🎓|🧕|👩‍⚕️|⭐|🌟/g, '').trim();
    return cleaned.charAt(0) || 'ص';
  }

  function getAvatarColor(name) {
    if (!name) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  }

  // --------------------------------------------------------------------------
  // 4. Firebase Initialization & Real-Time Sync Logic
  // --------------------------------------------------------------------------
  function initFirebase() {
    // 1. Always load cached messages first so the user sees their chat instantly
    loadCachedMessages();
    renderMessages();

    const defaultFirebaseConfig = {
      apiKey: "AIzaSyDummyKeyForYahiaFamilyApplet2026",
      authDomain: "yahia-sobeih-family.firebaseapp.com",
      databaseURL: "https://yahia-sobeih-family-default-rtdb.firebaseio.com",
      projectId: "yahia-sobeih-family",
      storageBucket: "yahia-sobeih-family.appspot.com",
      messagingSenderId: "183636514057",
      appId: "1:183636514057:web:9a8b7c6d5e4f3a2b1c"
    };

    let userConfig = null;
    let hasCustomConfig = false;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FB_CONFIG);
      if (saved) {
        userConfig = JSON.parse(saved);
        if (userConfig && userConfig.apiKey && !userConfig.apiKey.includes('DummyKey')) {
          hasCustomConfig = true;
        }
      }
    } catch (e) {
      console.warn('Failed parsing saved firebase config:', e);
    }

    const config = userConfig || defaultFirebaseConfig;

    // Populate Settings modal inputs
    if (DOM.fbApiKey) DOM.fbApiKey.value = config.apiKey || '';
    if (DOM.fbDbUrl) DOM.fbDbUrl.value = config.databaseURL || '';
    if (DOM.fbStorageBucket) DOM.fbStorageBucket.value = config.storageBucket || '';
    if (DOM.fbProjectId) DOM.fbProjectId.value = config.projectId || '';

    // Initialize BroadcastChannel for instant multi-tab sync
    if (window.BroadcastChannel) {
      try {
        state.broadcastChannel = new BroadcastChannel('yahia_family_chat_channel');
        state.broadcastChannel.onmessage = (event) => {
          if (!event.data) return;
          if (event.data.type === 'NEW_MESSAGE') {
            handleIncomingMessage(event.data.message);
          } else if (event.data.type === 'DELETE_MESSAGE') {
            handleDeletedMessage(event.data.messageId);
          } else if (event.data.type === 'EVENTS_UPDATED') {
            state.familyEvents = Array.isArray(event.data.events) ? event.data.events : [];
            localStorage.setItem(STORAGE_KEYS.FAMILY_EVENTS, JSON.stringify(state.familyEvents));
            updateEventsBadgeUI();
            if (DOM.eventsCalendarModal && DOM.eventsCalendarModal.style.display !== 'none') {
              renderFamilyEventsList();
            }
          } else if (event.data.type === 'ANNOUNCEMENT_UPDATED') {
            state.pinnedAnnouncement = event.data.announcement || null;
            renderPinnedBanner();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // Try initializing Firebase only if custom credentials exist, or test gracefully
    if (hasCustomConfig && window.firebase && firebase.initializeApp) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(config);
        }
        state.dbRef = firebase.database().ref('yahia_family_messages');
        state.storageRef = firebase.storage().ref();
        state.isFirebaseReady = true;

        DOM.networkStatusBadge.classList.remove('offline');
        DOM.networkStatusText.textContent = 'متصل بـ Firebase';

        // Listen for Realtime Database changes
        state.dbRef.limitToLast(150).on('value', (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const list = Object.keys(data).map(key => ({
              id: key,
              ...data[key]
            }));
            state.messages = list.sort((a, b) => a.timestamp - b.timestamp);
            saveMessagesCache();
            renderMessages();
          }
        }, (error) => {
          console.warn('Firebase RTDB note: using synchronized storage mode:', error.message);
          fallbackToLocalMode();
        });

      } catch (err) {
        console.warn('Firebase init fallback:', err);
        fallbackToLocalMode();
      }
    } else {
      fallbackToLocalMode();
    }
  }

  function fallbackToLocalMode() {
    state.isFirebaseReady = false;
    DOM.networkStatusBadge.classList.add('offline');
    DOM.networkStatusText.textContent = 'وضع التزامن العائلي المباشر';
  }

  function loadCachedMessages() {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.MESSAGES_CACHE);
      if (cached) {
        state.messages = JSON.parse(cached);
      } else {
        // Seed default initial family greetings
        const now = Date.now();
        state.messages = [
          {
            id: 'seed-1',
            sender: 'يحيي صبيح (الوالد)',
            text: 'السلام عليكم ورحمة الله وبركاته يا أبنائي وبناتي الكرام 🌹 أهلاً بكم جميعاً في مجلس عائلتنا المبارك.',
            timestamp: now - 3600000 * 2,
            reactions: { '❤️': 3, '🤲': 4 }
          },
          {
            id: 'seed-2',
            sender: 'أم محمد (الوالدة)',
            text: 'وعليكم السلام ورحمة الله وبركاته، ربي يحفظكم ويجمعنا دائماً على الخير والبركة والمحبة 🌸',
            timestamp: now - 3600000,
            reactions: { '❤️': 2, '🤲': 3 }
          }
        ];
        saveMessagesCache();
      }
    } catch (e) {
      state.messages = [];
    }
  }

  function saveMessagesCache() {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES_CACHE, JSON.stringify(state.messages));
    } catch (e) {}
  }

  function handleIncomingMessage(msg) {
    if (!state.messages.some(m => m.id === msg.id)) {
      state.messages.push(msg);
      state.messages.sort((a, b) => a.timestamp - b.timestamp);
      saveMessagesCache();
      renderMessages();
      playNotificationSound();
    }
  }

  function handleDeletedMessage(msgId) {
    state.messages = state.messages.filter(m => m.id !== msgId);
    saveMessagesCache();
    renderMessages();
  }

  // --------------------------------------------------------------------------
  // 5. Message Dispatching & Instant Synchronous Delivery
  // --------------------------------------------------------------------------
  async function sendMessage() {
    const text = (DOM.messageInput.value || '').trim();
    const attachment = state.pendingAttachment;

    if (!text && !attachment) return;

    if (!state.currentUser || !state.currentUser.trim()) {
      showUserSelectionModal(false);
      return;
    }

    // Generate unique message ID
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    const messagePayload = {
      id: msgId,
      sender: state.currentUser,
      senderAvatar: state.currentUserAvatar || getMemberAvatar(state.currentUser) || '',
      text: text,
      timestamp: Date.now(),
      reactions: {}
    };

    // Extract YouTube video ID if present
    const youtubeId = extractYouTubeId(text);
    if (youtubeId) {
      messagePayload.youtubeId = youtubeId;
    }

    // Handle Media Attachment
    if (attachment) {
      messagePayload.mediaUrl = attachment.dataUrl;
      messagePayload.mediaType = attachment.type;
      messagePayload.mediaName = attachment.name;
      messagePayload.mediaSize = attachment.size;
    }

    // 1. Optimistic Local Update - zero lag
    state.messages.push(messagePayload);
    saveMessagesCache();

    // 2. Reset Form & UI immediately
    DOM.messageInput.value = '';
    DOM.messageInput.style.height = 'auto';
    clearPendingAttachment();
    renderMessages();
    scrollToBottom(true);
    playNotificationSound();

    // 3. Broadcast to all other open tabs / windows
    if (state.broadcastChannel) {
      try {
        state.broadcastChannel.postMessage({
          type: 'NEW_MESSAGE',
          message: messagePayload
        });
      } catch (e) {}
    }

    // 4. Trigger storage sync for cross-window reactivity
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_ACTION, JSON.stringify({
        type: 'NEW_MESSAGE',
        id: msgId,
        time: Date.now()
      }));
    } catch (e) {}

    // 5. Asynchronously sync to Firebase in background without blocking UI
    if (state.isFirebaseReady && state.dbRef) {
      try {
        const newRef = state.dbRef.push();
        newRef.set({ ...messagePayload, id: newRef.key }).catch(err => {
          console.warn('Firebase async push note:', err.message);
        });
      } catch (err) {
        console.warn('Firebase sync dispatch error:', err);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. Media Attachments & Voice Note Recorder
  // --------------------------------------------------------------------------
  function handleFileSelect(file) {
    if (!file) return;

    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';

    const reader = new FileReader();
    reader.onload = (e) => {
      state.pendingAttachment = {
        file: file,
        type: type,
        dataUrl: e.target.result,
        name: file.name,
        size: file.size
      };
      showAttachmentPreview();
    };
    reader.readAsDataURL(file);
  }

  function showAttachmentPreview() {
    const att = state.pendingAttachment;
    if (!att) return;

    DOM.attachmentPreviewBar.style.display = 'block';
    DOM.previewFilename.textContent = att.name;
    DOM.previewFilesize.textContent = formatBytes(att.size);

    if (att.type === 'image') {
      DOM.previewThumbnail.innerHTML = `<img src="${att.dataUrl}" alt="preview">`;
    } else if (att.type === 'video') {
      DOM.previewThumbnail.innerHTML = `<i class="fa-solid fa-file-video"></i>`;
    } else if (att.type === 'audio') {
      DOM.previewThumbnail.innerHTML = `<i class="fa-solid fa-file-audio"></i>`;
    } else {
      DOM.previewThumbnail.innerHTML = `<i class="fa-solid fa-file-lines"></i>`;
    }
  }

  function clearPendingAttachment() {
    state.pendingAttachment = null;
    DOM.attachmentPreviewBar.style.display = 'none';
    DOM.fileInput.value = '';
    DOM.cameraInput.value = '';
  }

  function showUploadProgress(show, text = '') {
    DOM.uploadProgressBarContainer.style.display = show ? 'block' : 'none';
    if (text) DOM.uploadStatusText.textContent = text;
    DOM.uploadProgressBar.style.width = '0%';
    DOM.uploadPercentText.textContent = '0%';
  }

  function updateUploadProgress(percent) {
    DOM.uploadProgressBar.style.width = `${percent}%`;
    DOM.uploadPercentText.textContent = `${percent}%`;
  }

  // Audio Recording (Voice Notes)
  async function startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.audioChunks = [];
      state.mediaRecorder = new MediaRecorder(stream);

      state.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          state.audioChunks.push(event.data);
        }
      };

      state.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `تسجيل_صوتي_${Date.now()}.webm`, { type: 'audio/webm' });
        handleFileSelect(audioFile);
      };

      state.mediaRecorder.start();
      state.isRecording = true;
      state.recordStartTime = Date.now();

      // UI state
      DOM.audioRecordingBar.style.display = 'flex';
      DOM.messageForm.style.display = 'none';

      state.recordTimerInterval = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - state.recordStartTime) / 1000);
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        DOM.recordingTimer.textContent = `${mins}:${secs}`;
      }, 500);

    } catch (err) {
      alert('تعذر الوصول إلى الميكروفون. يرجى التأكد من منح الإذن للمتصفح.');
      console.error(err);
    }
  }

  function stopAudioRecording(send = true) {
    if (!state.isRecording || !state.mediaRecorder) return;

    clearInterval(state.recordTimerInterval);
    state.isRecording = false;

    if (send) {
      state.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `تسجيل_صوتي_${Date.now()}.webm`, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (e) => {
          state.pendingAttachment = {
            file: audioFile,
            type: 'audio',
            dataUrl: e.target.result,
            name: audioFile.name,
            size: audioFile.size
          };
          sendMessage();
        };
        reader.readAsDataURL(audioFile);
      };
      state.mediaRecorder.stop();
    } else {
      // Cancelled
      state.mediaRecorder.onstop = null;
      state.mediaRecorder.stop();
      state.pendingAttachment = null;
    }

    // Stop all audio tracks
    if (state.mediaRecorder.stream) {
      state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    DOM.audioRecordingBar.style.display = 'none';
    DOM.messageForm.style.display = 'flex';
    DOM.recordingTimer.textContent = '00:00';
  }

  // --------------------------------------------------------------------------
  // 7. Message Deletion & Reactions
  // --------------------------------------------------------------------------
  function promptDeleteMessage(msgId) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg) return;

    state.selectedDeleteId = msgId;

    // Fill contextual info
    if (DOM.deleteMsgSender) {
      DOM.deleteMsgSender.textContent = msg.sender || 'عضو العائلة';
    }
    if (DOM.deleteMsgAvatar) {
      const avatarSrc = msg.senderAvatar || getMemberAvatar(msg.sender);
      if (avatarSrc) {
        DOM.deleteMsgAvatar.innerHTML = `<img src="${avatarSrc}" alt="${escapeHTML(msg.sender || 'ع')}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;
        DOM.deleteMsgAvatar.style.background = 'transparent';
      } else {
        DOM.deleteMsgAvatar.innerHTML = '';
        DOM.deleteMsgAvatar.textContent = getInitials(msg.sender || 'ع');
        DOM.deleteMsgAvatar.style.background = getAvatarColor(msg.sender || '');
      }
    }
    if (DOM.deleteMsgTime) {
      const msgDate = new Date(msg.timestamp);
      DOM.deleteMsgTime.textContent = `${formatDateHeader(msgDate)}، ${formatArabicTime(msgDate)}`;
    }

    // Fill message preview snippet
    if (DOM.deleteMessagePreview) {
      if (msg.text && msg.mediaUrl) {
        DOM.deleteMessagePreview.innerHTML = `
          <div>${escapeHTML(msg.text)}</div>
          <div style="margin-top: 6px; color: var(--accent-secondary); font-size: 0.8rem;">
            <i class="fa-solid fa-paperclip"></i> مرفق: <strong>${escapeHTML(msg.mediaName || 'ملف وسائط')}</strong>
          </div>
        `;
      } else if (msg.text) {
        DOM.deleteMessagePreview.innerHTML = `<div>${escapeHTML(msg.text)}</div>`;
      } else if (msg.mediaUrl) {
        DOM.deleteMessagePreview.innerHTML = `
          <div style="color: var(--accent-secondary); font-size: 0.85rem;">
            <i class="fa-solid fa-paperclip"></i> مرفق: <strong>${escapeHTML(msg.mediaName || 'ملف وسائط')}</strong>
          </div>
        `;
      } else {
        DOM.deleteMessagePreview.textContent = 'رسالة في شات العائلة';
      }
    }

    // Reset safety checkbox and delete button state
    if (DOM.deleteSafetyCheck) {
      DOM.deleteSafetyCheck.checked = false;
    }
    if (DOM.confirmDeleteBtn) {
      DOM.confirmDeleteBtn.disabled = true;
    }

    DOM.deleteModal.style.display = 'flex';
  }

  async function confirmDeleteMessage() {
    const msgId = state.selectedDeleteId;
    if (!msgId) return;

    if (DOM.deleteSafetyCheck && !DOM.deleteSafetyCheck.checked) {
      alert('يرجى تحديد خيار تأكيد الأمان للمتابعة مع حذف الرسالة.');
      return;
    }

    if (state.isFirebaseReady && state.dbRef) {
      try {
        await state.dbRef.child(msgId).remove();
      } catch (e) {
        console.warn('Delete fallback:', e);
      }
    }

    handleDeletedMessage(msgId);

    if (state.broadcastChannel) {
      state.broadcastChannel.postMessage({
        type: 'DELETE_MESSAGE',
        messageId: msgId
      });
    }

    DOM.deleteModal.style.display = 'none';
    state.selectedDeleteId = null;
  }

  function toggleReaction(msgId, emoji) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = {};
    msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;

    if (state.isFirebaseReady && state.dbRef) {
      state.dbRef.child(msgId).child('reactions').set(msg.reactions);
    }
    saveMessagesCache();
    renderMessages();
  }

  // --------------------------------------------------------------------------
  // 8. Message Stream Rendering & Date Grouping
  // --------------------------------------------------------------------------
  function renderMessages() {
    let filteredMessages = state.messages;

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filteredMessages = state.messages.filter(m => 
        (m.text && m.text.toLowerCase().includes(q)) ||
        (m.sender && m.sender.toLowerCase().includes(q)) ||
        (m.mediaName && m.mediaName.toLowerCase().includes(q))
      );
      DOM.searchResultsCount.textContent = `تم العثور على ${filteredMessages.length} رسالة مطابقة`;
    }

    DOM.messagesStream.innerHTML = '';

    if (filteredMessages.length === 0) {
      DOM.familyWelcomeCard.style.display = 'block';
      return;
    }

    DOM.familyWelcomeCard.style.display = 'none';

    let lastDateString = '';

    filteredMessages.forEach(msg => {
      const msgDate = new Date(msg.timestamp);
      const dateKey = formatDateHeader(msgDate);

      // Render Date Divider if new day
      if (dateKey !== lastDateString) {
        lastDateString = dateKey;
        const divider = document.createElement('div');
        divider.className = 'date-divider';
        divider.innerHTML = `<span class="date-divider-pill">${dateKey}</span>`;
        DOM.messagesStream.appendChild(divider);
      }

      // Create Message Row
      const isOutgoing = msg.sender === state.currentUser;
      const row = document.createElement('div');
      row.className = `message-row ${isOutgoing ? 'outgoing' : 'incoming'}`;
      row.setAttribute('data-id', msg.id);

      // Sender Avatar
      const avatarEl = document.createElement('div');
      avatarEl.className = 'sender-avatar';
      const senderAvatarSrc = msg.senderAvatar || getMemberAvatar(msg.sender);
      if (senderAvatarSrc) {
        avatarEl.innerHTML = `<img src="${senderAvatarSrc}" alt="${escapeHTML(msg.sender)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;
        avatarEl.style.background = 'transparent';
      } else {
        avatarEl.textContent = getInitials(msg.sender);
        avatarEl.style.background = isOutgoing 
          ? 'var(--accent-gradient)' 
          : getAvatarColor(msg.sender);
      }

      // Bubble Box
      const bubbleBox = document.createElement('div');
      bubbleBox.className = 'message-bubble-box';

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';

      // Sender Name Tag
      const senderNameEl = document.createElement('div');
      senderNameEl.className = 'message-sender-name';
      senderNameEl.innerHTML = `<span>${escapeHTML(msg.sender)}</span>`;
      bubble.appendChild(senderNameEl);

      // Polls or Special Message Types
      if (msg.type === 'poll' || msg.pollData) {
        const pollContainer = createPollMessageElement(msg);
        bubble.appendChild(pollContainer);
      }

      // Media Rendering
      if (msg.mediaUrl) {
        if (msg.mediaType === 'image') {
          const imgWrap = document.createElement('div');
          imgWrap.className = 'chat-media-image';
          imgWrap.innerHTML = `<img src="${msg.mediaUrl}" alt="${escapeHTML(msg.mediaName || 'صورة')}" loading="lazy">`;
          imgWrap.onclick = () => {
            const allImages = state.messages
              .filter(m => m.mediaType === 'image' && m.mediaUrl)
              .map(m => ({ url: m.mediaUrl, sender: m.sender, time: formatArabicTime(new Date(m.timestamp)) }));
            const curIdx = allImages.findIndex(img => img.url === msg.mediaUrl);
            openLightbox(msg.mediaUrl, msg.sender, formatArabicTime(msgDate), allImages, curIdx >= 0 ? curIdx : 0);
          };
          bubble.appendChild(imgWrap);
        } else if (msg.mediaType === 'video') {
          const vidWrap = document.createElement('div');
          vidWrap.className = 'chat-media-video';
          vidWrap.innerHTML = `<video controls playsinline src="${msg.mediaUrl}"></video>`;
          bubble.appendChild(vidWrap);
        } else if (msg.mediaType === 'audio') {
          const audWaveWrap = createWaveformPlayerElement(msg);
          bubble.appendChild(audWaveWrap);
        }
      }

      // YouTube Video Embed
      if (msg.youtubeId) {
        const ytWrap = document.createElement('div');
        ytWrap.className = 'youtube-embed-wrapper';
        ytWrap.innerHTML = `
          <div class="video-aspect">
            <iframe 
              src="https://www.youtube.com/embed/${msg.youtubeId}" 
              title="YouTube video player" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowfullscreen>
            </iframe>
          </div>
        `;
        bubble.appendChild(ytWrap);
      }

      // Text Message Body
      if (msg.text) {
        const textEl = document.createElement('div');
        textEl.className = 'message-text';
        textEl.innerHTML = formatMessageText(msg.text);
        bubble.appendChild(textEl);
      }

      // Footer Meta (Time + Delete Button)
      const footerMeta = document.createElement('div');
      footerMeta.className = 'message-footer-meta';
      
      const timeSpan = document.createElement('span');
      timeSpan.className = 'message-time';
      timeSpan.textContent = formatArabicTime(msgDate);
      footerMeta.appendChild(timeSpan);

      if (isOutgoing) {
        const checkSpan = document.createElement('span');
        checkSpan.className = 'message-status-check';
        checkSpan.innerHTML = `<i class="fa-solid fa-check-double" style="color: #38bdf8;"></i>`;
        footerMeta.appendChild(checkSpan);
      }

      // Delete Button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'msg-delete-btn';
      deleteBtn.title = 'حذف الرسالة';
      deleteBtn.innerHTML = `<i class="fa-regular fa-trash-can"></i>`;
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        promptDeleteMessage(msg.id);
      };
      footerMeta.appendChild(deleteBtn);

      bubble.appendChild(footerMeta);
      bubbleBox.appendChild(bubble);

      // Reactions Display
      if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        const reactionsBar = document.createElement('div');
        reactionsBar.className = 'bubble-reactions-bar';
        for (const [emoji, count] of Object.entries(msg.reactions)) {
          if (count > 0) {
            const rPill = document.createElement('span');
            rPill.className = 'reaction-pill';
            rPill.innerHTML = `${emoji} <strong>${count}</strong>`;
            rPill.onclick = () => toggleReaction(msg.id, emoji);
            reactionsBar.appendChild(rPill);
          }
        }
        bubbleBox.appendChild(reactionsBar);
      }

      row.appendChild(avatarEl);
      row.appendChild(bubbleBox);
      DOM.messagesStream.appendChild(row);
    });

    updateMediaCounts();
    setTimeout(updateScrollNavUI, 50);
  }

  // --------------------------------------------------------------------------
  // 9. Formatters & Helpers (Arabic Date, YouTube Regex, Lightbox)
  // --------------------------------------------------------------------------
  function extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    const match = url.match(regExp);
    return match ? match[1] : null;
  }

  function formatMessageText(text) {
    if (!text) return '';
    let escaped = escapeHTML(text);

    // Convert generic URLs into clickable links (excluding pure YouTube embeds)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    escaped = escaped.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link-card"><i class="fa-solid fa-arrow-up-right-from-square"></i> <span>${url}</span></a>`;
    });

    return escaped;
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDateHeader(date) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(date, today)) return 'اليوم';
    if (isSameDay(date, yesterday)) return 'أمس';

    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName}، ${dayNum} ${monthName} ${year}`;
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  function formatArabicTime(date) {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  }

  function formatBytes(bytes, decimals = 1) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function scrollToBottom(smooth = true) {
    if (!DOM.chatMain) return;
    const target = DOM.chatMain.scrollHeight;
    try {
      DOM.chatMain.scrollTo({
        top: target,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } catch (e) {
      DOM.chatMain.scrollTop = target;
    }
    setTimeout(() => {
      if (DOM.chatMain) {
        updateScrollNavUI();
      }
    }, smooth ? 250 : 20);
  }

  function scrollToTop(smooth = true) {
    if (!DOM.chatMain) return;
    try {
      DOM.chatMain.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } catch (e) {
      DOM.chatMain.scrollTop = 0;
    }
    setTimeout(() => {
      if (DOM.chatMain) {
        updateScrollNavUI();
      }
    }, smooth ? 250 : 20);
  }

  function scrollStep(delta = 280) {
    if (!DOM.chatMain) return;
    try {
      DOM.chatMain.scrollBy({
        top: delta,
        behavior: 'smooth'
      });
    } catch (e) {
      DOM.chatMain.scrollTop += delta;
    }
    setTimeout(updateScrollNavUI, 200);
  }

  function updateScrollNavUI() {
    if (!DOM.chatMain || !DOM.chatNavControls) return;
    const scrollTop = DOM.chatMain.scrollTop;
    const scrollHeight = DOM.chatMain.scrollHeight;
    const clientHeight = DOM.chatMain.clientHeight;
    
    const isAtTop = scrollTop <= 20;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 30;

    // Adjust button styles / active states without blocking clicks
    if (DOM.scrollToTopBtn) {
      DOM.scrollToTopBtn.style.opacity = isAtTop ? '0.5' : '1';
    }
    if (DOM.scrollToBottomBtn) {
      DOM.scrollToBottomBtn.style.opacity = isAtBottom ? '0.5' : '1';
      // Hide unread count if reached bottom
      if (isAtBottom && DOM.unreadCountBadge) {
        DOM.unreadCountBadge.style.display = 'none';
      }
    }
  }

  function playNotificationSound() {
    if (!state.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  }

  // --------------------------------------------------------------------------
  // 10. Interactive Audio Waveform Player
  // --------------------------------------------------------------------------
  function createWaveformPlayerElement(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-audio-waveform-player';
    wrapper.setAttribute('data-msg-id', msg.id);

    const audio = new Audio(msg.mediaUrl);
    audio.preload = 'metadata';

    const playBtn = document.createElement('button');
    playBtn.className = 'waveform-play-btn';
    playBtn.setAttribute('type', 'button');
    playBtn.title = 'تشغيل / إيقاف التسجيل الصوتي';
    playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;

    const mainTrack = document.createElement('div');
    mainTrack.className = 'waveform-main-track';

    const headerLine = document.createElement('div');
    headerLine.className = 'waveform-header-line';
    headerLine.innerHTML = `
      <span class="waveform-voice-badge"><i class="fa-solid fa-microphone-lines"></i> رسالة صوتية عائلية</span>
      <span class="waveform-time-label">00:00</span>
    `;
    const timeLabel = headerLine.querySelector('.waveform-time-label');

    // Create Waveform Visualizer Bars
    const barsContainer = document.createElement('div');
    barsContainer.className = 'waveform-bars-container';
    const totalBars = 28;
    const barElements = [];

    // Pseudo-random deterministic heights for bars
    let seed = 0;
    for (let i = 0; i < (msg.id || '').length; i++) {
      seed = (seed + msg.id.charCodeAt(i)) % 100;
    }

    for (let i = 0; i < totalBars; i++) {
      const bar = document.createElement('div');
      bar.className = 'waveform-bar';
      // Harmonic wave pattern + pseudo noise
      const heightPercent = 20 + Math.abs(Math.sin((i + seed) * 0.45) * 55) + ((i * 7) % 25);
      bar.style.height = `${Math.min(95, Math.max(18, heightPercent))}%`;
      barsContainer.appendChild(bar);
      barElements.push(bar);
    }

    mainTrack.appendChild(headerLine);
    mainTrack.appendChild(barsContainer);

    // Speed Multiplier Button
    const speedBtn = document.createElement('button');
    speedBtn.className = 'waveform-speed-btn';
    speedBtn.setAttribute('type', 'button');
    speedBtn.title = 'تغيير سرعة التشغيل';
    speedBtn.textContent = '1x';

    let currentSpeedIndex = 0;
    const speeds = [1.0, 1.5, 2.0];

    speedBtn.onclick = (e) => {
      e.stopPropagation();
      currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
      const newSpeed = speeds[currentSpeedIndex];
      audio.playbackRate = newSpeed;
      speedBtn.textContent = `${newSpeed}x`;
    };

    // Click on waveform to seek
    barsContainer.onclick = (e) => {
      e.stopPropagation();
      const rect = barsContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, clickX / rect.width));
      if (audio.duration) {
        audio.currentTime = percent * audio.duration;
      }
    };

    // Format seconds to mm:ss
    const formatAudioTime = (sec) => {
      if (isNaN(sec) || sec < 0) return '00:00';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    audio.addEventListener('loadedmetadata', () => {
      timeLabel.textContent = formatAudioTime(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const progress = audio.currentTime / audio.duration;
      timeLabel.textContent = `${formatAudioTime(audio.currentTime)} / ${formatAudioTime(audio.duration)}`;
      
      const activeBarCount = Math.floor(progress * totalBars);
      barElements.forEach((bar, idx) => {
        bar.classList.toggle('played', idx <= activeBarCount);
      });
    });

    audio.addEventListener('play', () => {
      // Pause any previously playing audio instance
      if (state.activeAudioPlayer && state.activeAudioPlayer !== audio) {
        try { state.activeAudioPlayer.pause(); } catch(e){}
      }
      state.activeAudioPlayer = audio;
      playBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
      playBtn.classList.add('playing');
      wrapper.classList.add('is-playing');
    });

    audio.addEventListener('pause', () => {
      playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
      playBtn.classList.remove('playing');
      wrapper.classList.remove('is-playing');
      if (state.activeAudioPlayer === audio) {
        state.activeAudioPlayer = null;
      }
    });

    audio.addEventListener('ended', () => {
      playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
      playBtn.classList.remove('playing');
      wrapper.classList.remove('is-playing');
      barElements.forEach(bar => bar.classList.remove('played'));
      timeLabel.textContent = formatAudioTime(audio.duration);
      if (state.activeAudioPlayer === audio) {
        state.activeAudioPlayer = null;
      }
    });

    playBtn.onclick = (e) => {
      e.stopPropagation();
      if (audio.paused) {
        audio.play().catch(err => console.warn('Audio play error:', err));
      } else {
        audio.pause();
      }
    };

    wrapper.appendChild(playBtn);
    wrapper.appendChild(mainTrack);
    wrapper.appendChild(speedBtn);

    return wrapper;
  }

  // --------------------------------------------------------------------------
  // 11. Family Polls & Interactive Voting
  // --------------------------------------------------------------------------
  function createPollMessageElement(msg) {
    const poll = msg.pollData || {
      question: msg.text || 'استطلاع رأي عائلي',
      options: [],
      multiChoice: false,
      isClosed: false,
      createdBy: msg.sender
    };

    const container = document.createElement('div');
    container.className = 'family-poll-container';
    container.setAttribute('data-poll-msg-id', msg.id);

    // Compute total votes
    let totalVotes = 0;
    const optionVoteCounts = (poll.options || []).map(opt => {
      const votes = Array.isArray(opt.votes) ? opt.votes : [];
      totalVotes += votes.length;
      return votes.length;
    });

    const isCreatorOrAdmin = msg.sender === state.currentUser || state.currentUser.includes('الوالد') || state.currentUser.includes('يحيي');

    // Header
    const header = document.createElement('div');
    header.className = 'poll-header';
    header.innerHTML = `
      <div class="poll-badge-row">
        <span class="poll-tag ${poll.isClosed ? 'closed' : 'active'}">
          <i class="fa-solid ${poll.isClosed ? 'fa-lock' : 'fa-square-poll-vertical'}"></i>
          ${poll.isClosed ? 'تم إغلاق التصويت' : 'استطلاع رأي نشط'}
        </span>
        <span class="poll-type-tag">${poll.multiChoice ? 'اختيار متعدد' : 'اختيار فردي'}</span>
      </div>
      <h4 class="poll-question-title">${escapeHTML(poll.question)}</h4>
    `;
    container.appendChild(header);

    // Options List
    const optionsList = document.createElement('div');
    optionsList.className = 'poll-options-list';

    (poll.options || []).forEach((opt, idx) => {
      const votes = Array.isArray(opt.votes) ? opt.votes : [];
      const hasVoted = votes.includes(state.currentUser);
      const count = votes.length;
      const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

      const optRow = document.createElement('div');
      optRow.className = `poll-option-row ${hasVoted ? 'voted' : ''} ${poll.isClosed ? 'closed' : ''}`;

      // Progress Fill Track
      const fillBar = document.createElement('div');
      fillBar.className = 'poll-option-fill';
      fillBar.style.width = `${percent}%`;
      optRow.appendChild(fillBar);

      // Content Layer
      const optContent = document.createElement('div');
      optContent.className = 'poll-option-content';

      const checkIcon = document.createElement('span');
      checkIcon.className = 'poll-check-icon';
      checkIcon.innerHTML = hasVoted 
        ? `<i class="fa-solid fa-circle-check"></i>` 
        : `<i class="fa-regular ${poll.multiChoice ? 'fa-square' : 'fa-circle'}"></i>`;

      const optText = document.createElement('span');
      optText.className = 'poll-option-text';
      optText.textContent = opt.text;

      const optStats = document.createElement('span');
      optStats.className = 'poll-option-stats';
      optStats.innerHTML = `<strong>${percent}%</strong> (${count})`;

      optContent.appendChild(checkIcon);
      optContent.appendChild(optText);
      optContent.appendChild(optStats);
      optRow.appendChild(optContent);

      // Voter Avatars Preview
      if (votes.length > 0) {
        const votersWrap = document.createElement('div');
        votersWrap.className = 'poll-voters-bar';
        votes.slice(0, 5).forEach(voterName => {
          const voterChip = document.createElement('span');
          voterChip.className = 'poll-voter-chip';
          voterChip.title = voterName;
          const avSrc = getMemberAvatar(voterName);
          if (avSrc) {
            voterChip.innerHTML = `<img src="${avSrc}" alt="${escapeHTML(voterName)}">`;
          } else {
            voterChip.textContent = getInitials(voterName);
            voterChip.style.background = getAvatarColor(voterName);
          }
          votersWrap.appendChild(voterChip);
        });
        if (votes.length > 5) {
          const moreBadge = document.createElement('span');
          moreBadge.className = 'poll-voter-more';
          moreBadge.textContent = `+${votes.length - 5}`;
          votersWrap.appendChild(moreBadge);
        }
        optRow.appendChild(votersWrap);
      }

      // Voting Click Handler
      if (!poll.isClosed) {
        optRow.onclick = (e) => {
          e.stopPropagation();
          handlePollVote(msg.id, opt.id);
        };
      }

      optionsList.appendChild(optRow);
    });

    container.appendChild(optionsList);

    // Footer Info & Actions
    const footer = document.createElement('div');
    footer.className = 'poll-footer-info';
    footer.innerHTML = `
      <span class="poll-total-votes"><i class="fa-solid fa-users"></i> إجمالي الأصوات: <strong>${totalVotes}</strong></span>
    `;

    if (isCreatorOrAdmin) {
      const toggleCloseBtn = document.createElement('button');
      toggleCloseBtn.className = 'btn-poll-action';
      toggleCloseBtn.type = 'button';
      toggleCloseBtn.innerHTML = poll.isClosed 
        ? `<i class="fa-solid fa-lock-open"></i> إعادة فتح التصويت` 
        : `<i class="fa-solid fa-lock"></i> إنهاء الاستطلاع`;
      
      toggleCloseBtn.onclick = (e) => {
        e.stopPropagation();
        togglePollClose(msg.id);
      };
      footer.appendChild(toggleCloseBtn);
    }

    container.appendChild(footer);
    return container;
  }

  function handlePollVote(msgId, optionId) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg || !msg.pollData || msg.pollData.isClosed) return;

    const poll = msg.pollData;
    const voter = state.currentUser;

    if (!poll.multiChoice) {
      // Single choice: remove from other options first
      poll.options.forEach(opt => {
        if (!Array.isArray(opt.votes)) opt.votes = [];
        opt.votes = opt.votes.filter(name => name !== voter);
      });
      // Toggle on the clicked option
      const targetOpt = poll.options.find(opt => opt.id === optionId);
      if (targetOpt) {
        targetOpt.votes.push(voter);
      }
    } else {
      // Multiple choice: toggle on clicked option
      const targetOpt = poll.options.find(opt => opt.id === optionId);
      if (targetOpt) {
        if (!Array.isArray(targetOpt.votes)) targetOpt.votes = [];
        if (targetOpt.votes.includes(voter)) {
          targetOpt.votes = targetOpt.votes.filter(name => name !== voter);
        } else {
          targetOpt.votes.push(voter);
        }
      }
    }

    // Save and Sync
    saveMessagesCache();
    renderMessages();

    if (state.isFirebaseReady && state.dbRef) {
      state.dbRef.child(msgId).child('pollData').set(poll);
    }
    if (state.broadcastChannel) {
      try {
        state.broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: msg });
      } catch(e){}
    }
  }

  function togglePollClose(msgId) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg || !msg.pollData) return;

    msg.pollData.isClosed = !msg.pollData.isClosed;
    saveMessagesCache();
    renderMessages();

    if (state.isFirebaseReady && state.dbRef) {
      state.dbRef.child(msgId).child('pollData').child('isClosed').set(msg.pollData.isClosed);
    }
    if (state.broadcastChannel) {
      try {
        state.broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: msg });
      } catch(e){}
    }
  }

  function openPollCreateModal() {
    if (DOM.pollCreateModal) {
      DOM.pollQuestionInput.value = '';
      DOM.pollMultiChoice.checked = false;
      resetPollOptionsInputs();
      DOM.pollCreateModal.style.display = 'flex';
      setTimeout(() => DOM.pollQuestionInput.focus(), 100);
    }
  }

  function resetPollOptionsInputs() {
    if (!DOM.pollOptionsList) return;
    DOM.pollOptionsList.innerHTML = `
      <div class="poll-option-input-row">
        <span class="poll-option-num">1</span>
        <input type="text" class="poll-opt-input" placeholder="الخيار الأول (مثال: نزهة برية)" maxlength="60">
      </div>
      <div class="poll-option-input-row">
        <span class="poll-option-num">2</span>
        <input type="text" class="poll-opt-input" placeholder="الخيار الثاني (مثال: زيارة الشاطئ)" maxlength="60">
      </div>
    `;
  }

  function addPollOptionInput() {
    if (!DOM.pollOptionsList) return;
    const currentRows = DOM.pollOptionsList.querySelectorAll('.poll-option-input-row');
    if (currentRows.length >= 6) {
      alert('الحد الأقصى لخيارات الاستطلاع هو 6 خيارات.');
      return;
    }
    const newIdx = currentRows.length + 1;
    const row = document.createElement('div');
    row.className = 'poll-option-input-row';
    row.innerHTML = `
      <span class="poll-option-num">${newIdx}</span>
      <input type="text" class="poll-opt-input" placeholder="خيار إضافي ${newIdx}" maxlength="60">
      <button type="button" class="btn-remove-opt" title="حذف هذا الخيار"><i class="fa-solid fa-xmark"></i></button>
    `;
    row.querySelector('.btn-remove-opt').onclick = () => {
      row.remove();
      // Renumber
      DOM.pollOptionsList.querySelectorAll('.poll-option-input-row').forEach((r, i) => {
        r.querySelector('.poll-option-num').textContent = i + 1;
      });
    };
    DOM.pollOptionsList.appendChild(row);
    row.querySelector('input').focus();
  }

  function submitPoll() {
    const question = (DOM.pollQuestionInput ? DOM.pollQuestionInput.value : '').trim();
    if (!question) {
      alert('يرجى كتابة سؤال الاستطلاع أولاً.');
      if (DOM.pollQuestionInput) DOM.pollQuestionInput.focus();
      return;
    }

    const optInputs = DOM.pollOptionsList.querySelectorAll('.poll-opt-input');
    const options = [];
    optInputs.forEach((inp, idx) => {
      const val = inp.value.trim();
      if (val) {
        options.push({
          id: `opt_${Date.now()}_${idx}`,
          text: val,
          votes: []
        });
      }
    });

    if (options.length < 2) {
      alert('يرجى تحديد خيارين على الأقل للاستطلاع.');
      return;
    }

    const multiChoice = DOM.pollMultiChoice ? DOM.pollMultiChoice.checked : false;

    const pollMessage = {
      id: `msg_poll_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sender: state.currentUser,
      senderAvatar: state.currentUserAvatar || getMemberAvatar(state.currentUser) || '',
      type: 'poll',
      text: `📊 استطلاع رأي عائلي: ${question}`,
      pollData: {
        question: question,
        options: options,
        multiChoice: multiChoice,
        isClosed: false,
        createdBy: state.currentUser
      },
      timestamp: Date.now(),
      reactions: {}
    };

    if (DOM.pollCreateModal) {
      DOM.pollCreateModal.style.display = 'none';
    }

    // Save locally
    state.messages.push(pollMessage);
    saveMessagesCache();
    renderMessages();
    scrollToBottom(true);
    playNotificationSound();

    // Broadcast across tabs
    if (state.broadcastChannel) {
      try {
        state.broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: pollMessage });
      } catch(e){}
    }

    // Firebase Sync
    if (state.isFirebaseReady && state.dbRef) {
      state.dbRef.child(pollMessage.id).set(pollMessage);
    }
  }

  // --------------------------------------------------------------------------
  // 12. Pinned Family Announcements
  // --------------------------------------------------------------------------
  function initPinnedAnnouncements() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PINNED_ANNOUNCEMENT);
      if (saved) {
        state.pinnedAnnouncement = JSON.parse(saved);
      }
    } catch(e){}

    renderPinnedBanner();

    // Sync with Firebase RTDB if available
    if (window.firebase && firebase.apps.length) {
      try {
        state.announcementDbRef = firebase.database().ref('yahia_family_announcement');
        state.announcementDbRef.on('value', (snapshot) => {
          const val = snapshot.val();
          if (val) {
            state.pinnedAnnouncement = val;
            localStorage.setItem(STORAGE_KEYS.PINNED_ANNOUNCEMENT, JSON.stringify(val));
          } else {
            state.pinnedAnnouncement = null;
            localStorage.removeItem(STORAGE_KEYS.PINNED_ANNOUNCEMENT);
          }
          renderPinnedBanner();
        });
      } catch(e){}
    }
  }

  function renderPinnedBanner() {
    if (!DOM.pinnedAnnouncementBanner) return;

    if (state.pinnedAnnouncement && state.pinnedAnnouncement.text) {
      DOM.pinnedAnnouncementBanner.style.display = 'flex';
      if (DOM.pinnedTitle) DOM.pinnedTitle.textContent = state.pinnedAnnouncement.title || 'إعلان عائلي هام';
      if (DOM.pinnedSender) DOM.pinnedSender.textContent = `بواسطة: ${state.pinnedAnnouncement.sender || 'إدارة العائلة'}`;
      if (DOM.pinnedText) DOM.pinnedText.textContent = state.pinnedAnnouncement.text;
      if (DOM.pinnedBadgeDot) DOM.pinnedBadgeDot.style.display = 'block';
    } else {
      DOM.pinnedAnnouncementBanner.style.display = 'none';
      if (DOM.pinnedBadgeDot) DOM.pinnedBadgeDot.style.display = 'none';
    }
  }

  function openAnnouncementModal() {
    if (!DOM.announcementModal) return;
    if (state.pinnedAnnouncement) {
      DOM.announcementTitleInput.value = state.pinnedAnnouncement.title || '';
      DOM.announcementTextInput.value = state.pinnedAnnouncement.text || '';
      if (DOM.unpinAnnouncementBtn) DOM.unpinAnnouncementBtn.style.display = 'inline-flex';
    } else {
      DOM.announcementTitleInput.value = '';
      DOM.announcementTextInput.value = '';
      if (DOM.unpinAnnouncementBtn) DOM.unpinAnnouncementBtn.style.display = 'none';
    }
    DOM.announcementModal.style.display = 'flex';
    setTimeout(() => DOM.announcementTitleInput.focus(), 100);
  }

  function savePinnedAnnouncement() {
    const title = (DOM.announcementTitleInput ? DOM.announcementTitleInput.value : '').trim();
    const text = (DOM.announcementTextInput ? DOM.announcementTextInput.value : '').trim();

    if (!text) {
      alert('يرجى كتابة نص الإعلان أو الملاحظة العائلية.');
      if (DOM.announcementTextInput) DOM.announcementTextInput.focus();
      return;
    }

    const announcementData = {
      title: title || 'إعلان عائلي هام',
      text: text,
      sender: state.currentUser,
      timestamp: Date.now()
    };

    state.pinnedAnnouncement = announcementData;
    localStorage.setItem(STORAGE_KEYS.PINNED_ANNOUNCEMENT, JSON.stringify(announcementData));
    renderPinnedBanner();

    if (DOM.announcementModal) DOM.announcementModal.style.display = 'none';

    if (state.isFirebaseReady && state.announcementDbRef) {
      state.announcementDbRef.set(announcementData);
    }
  }

  function unpinAnnouncement() {
    state.pinnedAnnouncement = null;
    localStorage.removeItem(STORAGE_KEYS.PINNED_ANNOUNCEMENT);
    renderPinnedBanner();

    if (DOM.announcementModal) DOM.announcementModal.style.display = 'none';

    if (state.isFirebaseReady && state.announcementDbRef) {
      state.announcementDbRef.remove();
    }
  }

  // --------------------------------------------------------------------------
  // 13. Family Calendar & Events System
  // --------------------------------------------------------------------------
  const DEFAULT_FAMILY_EVENTS = [
    {
      id: 'evt_1',
      category: 'birthday',
      title: 'عيد ميلاد الوالد يحيي صبيح 🎂',
      date: '2026-09-15',
      member: 'يحيي صبيح (الوالد)',
      notes: 'نسأل الله له دوام الصحة والعافية وطول العمر في طاعته'
    },
    {
      id: 'evt_2',
      category: 'gathering',
      title: 'الاجتماع العائلي الدوري الأسبوعي',
      date: '2026-08-20',
      member: 'كافة أفراد العائلة',
      notes: 'التجمع بعد صلاة العشاء في منزل الوالد'
    },
    {
      id: 'evt_3',
      category: 'graduation',
      title: 'حفل تخرج وتكريم أبناء العائلة',
      date: '2026-08-28',
      member: 'الخريجين والناجحين',
      notes: 'توزيع الهدايا التذكارية والاحتفال بالنجاح'
    },
    {
      id: 'evt_4',
      category: 'islamic',
      title: 'ذكرى المولد النبوي الشريف 🌙',
      date: '2026-09-04',
      member: 'العائلة الكريمة',
      notes: 'أعاده الله علينا وعليكم بالخير واليمن والبركات'
    }
  ];

  function initFamilyEvents() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FAMILY_EVENTS);
      if (saved) {
        state.familyEvents = JSON.parse(saved);
      } else {
        state.familyEvents = DEFAULT_FAMILY_EVENTS;
        localStorage.setItem(STORAGE_KEYS.FAMILY_EVENTS, JSON.stringify(state.familyEvents));
      }
    } catch(e){
      state.familyEvents = DEFAULT_FAMILY_EVENTS;
    }

    updateEventsBadgeUI();

    // Firebase RTDB Sync
    if (window.firebase && firebase.apps.length) {
      try {
        state.eventsDbRef = firebase.database().ref('yahia_family_events');
        state.eventsDbRef.on('value', (snapshot) => {
          const val = snapshot.val();
          if (val) {
            state.familyEvents = Array.isArray(val) ? val : Object.values(val);
            localStorage.setItem(STORAGE_KEYS.FAMILY_EVENTS, JSON.stringify(state.familyEvents));
            updateEventsBadgeUI();
            if (DOM.eventsCalendarModal && DOM.eventsCalendarModal.style.display !== 'none') {
              renderFamilyEventsList();
            }
          }
        });
      } catch(e){}
    }
  }

  function getDaysUntil(dateStr) {
    if (!dateStr) return { days: 999, text: '', statusClass: '' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { days: 0, text: 'اليوم 🎉', statusClass: 'today' };
    } else if (diffDays === 1) {
      return { days: 1, text: 'غداً ⏳', statusClass: 'soon' };
    } else if (diffDays > 1 && diffDays <= 7) {
      return { days: diffDays, text: `بعد ${diffDays} أيام`, statusClass: 'soon' };
    } else if (diffDays > 7) {
      return { days: diffDays, text: `بعد ${diffDays} يوماً`, statusClass: 'upcoming' };
    } else {
      return { days: diffDays, text: `مضت منذ ${Math.abs(diffDays)} يوماً`, statusClass: 'past' };
    }
  }

  function updateEventsBadgeUI() {
    const upcoming = state.familyEvents.filter(ev => {
      const { days } = getDaysUntil(ev.date);
      return days >= 0 && days <= 30;
    });

    if (DOM.eventsCountBadge) {
      if (upcoming.length > 0) {
        DOM.eventsCountBadge.textContent = upcoming.length;
        DOM.eventsCountBadge.style.display = 'block';
      } else {
        DOM.eventsCountBadge.style.display = 'none';
      }
    }
    if (DOM.upcomingEventsCount) {
      DOM.upcomingEventsCount.textContent = `${upcoming.length} مناسبة قادمة هذا الشهر`;
    }
  }

  function renderFamilyEventsList() {
    if (!DOM.eventsListContainer) return;
    DOM.eventsListContainer.innerHTML = '';

    if (state.familyEvents.length === 0) {
      DOM.eventsListContainer.innerHTML = `
        <div class="events-empty-state">
          <i class="fa-solid fa-calendar-xmark"></i>
          <p>لا توجد مناسبات مسجلة حتى الآن. اضغط على "إضافة مناسبة جديدة" بالأعلى لتسجيل أعياد الميلاد واللقاءات العائلية.</p>
        </div>
      `;
      return;
    }

    // Sort by nearest date
    const sorted = [...state.familyEvents].sort((a, b) => {
      const da = getDaysUntil(a.date).days;
      const db = getDaysUntil(b.date).days;
      if (da >= 0 && db >= 0) return da - db;
      if (da >= 0 && db < 0) return -1;
      if (da < 0 && db >= 0) return 1;
      return db - da;
    });

    const categoryIcons = {
      birthday: '🎂',
      anniversary: '💍',
      graduation: '🎓',
      gathering: '👨‍👩‍👧‍👦',
      islamic: '🌙',
      other: '🎉'
    };

    sorted.forEach(ev => {
      const countdown = getDaysUntil(ev.date);
      const card = document.createElement('div');
      card.className = `event-item-card category-${ev.category || 'other'}`;

      card.innerHTML = `
        <div class="event-card-header">
          <div class="event-type-icon">${categoryIcons[ev.category] || '🎉'}</div>
          <div class="event-title-wrap">
            <h4 class="event-title">${escapeHTML(ev.title)}</h4>
            <div class="event-meta-line">
              <span><i class="fa-regular fa-calendar"></i> ${ev.date}</span>
              ${ev.member ? `<span><i class="fa-regular fa-user"></i> ${escapeHTML(ev.member)}</span>` : ''}
            </div>
          </div>
          <span class="event-countdown-badge ${countdown.statusClass}">${countdown.text}</span>
        </div>
        ${ev.notes ? `<p class="event-notes">${escapeHTML(ev.notes)}</p>` : ''}
        <div class="event-card-footer">
          <button type="button" class="btn-event-greet" data-event-id="${ev.id}">
            <i class="fa-solid fa-heart"></i> إرسال تهنئة في الدردشة
          </button>
          <button type="button" class="btn-event-delete" data-event-id="${ev.id}" title="حذف المناسبة">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      `;

      card.querySelector('.btn-event-greet').onclick = () => {
        sendEventGreeting(ev);
        DOM.eventsCalendarModal.style.display = 'none';
      };

      card.querySelector('.btn-event-delete').onclick = () => {
        deleteFamilyEvent(ev.id);
      };

      DOM.eventsListContainer.appendChild(card);
    });
  }

  function sendEventGreeting(ev) {
    const greetingText = `🌹 بمناسبة: ${ev.title}، نتقدم بأحر التهاني والتبريكات سائلين المولى عز وجل أن يبارك في عائلتنا ويديم علينا المحبة والسرور 🤲✨`;
    DOM.messageInput.value = greetingText;
    sendMessage();
  }

  function saveNewFamilyEvent() {
    const title = (DOM.eventTitleInput ? DOM.eventTitleInput.value : '').trim();
    const date = (DOM.eventDateInput ? DOM.eventDateInput.value : '').trim();
    const category = DOM.eventCategorySelect ? DOM.eventCategorySelect.value : 'birthday';
    const member = (DOM.eventMemberInput ? DOM.eventMemberInput.value : '').trim();
    const notes = (DOM.eventNotesInput ? DOM.eventNotesInput.value : '').trim();

    if (!title || !date) {
      alert('يرجى إدخال عنوان المناسبة وتاريخها.');
      return;
    }

    const newEvent = {
      id: `evt_${Date.now()}`,
      category,
      title,
      date,
      member,
      notes
    };

    state.familyEvents.push(newEvent);
    localStorage.setItem(STORAGE_KEYS.FAMILY_EVENTS, JSON.stringify(state.familyEvents));

    if (DOM.addEventFormCard) DOM.addEventFormCard.style.display = 'none';
    if (DOM.eventTitleInput) DOM.eventTitleInput.value = '';
    if (DOM.eventDateInput) DOM.eventDateInput.value = '';
    if (DOM.eventMemberInput) DOM.eventMemberInput.value = '';
    if (DOM.eventNotesInput) DOM.eventNotesInput.value = '';

    updateEventsBadgeUI();
    renderFamilyEventsList();

    if (state.isFirebaseReady && state.eventsDbRef) {
      state.eventsDbRef.set(state.familyEvents);
    }
  }

  function deleteFamilyEvent(id) {
    if (!confirm('هل أنت متأكد من حذف هذه المناسبة؟')) return;
    state.familyEvents = state.familyEvents.filter(ev => ev.id !== id);
    localStorage.setItem(STORAGE_KEYS.FAMILY_EVENTS, JSON.stringify(state.familyEvents));
    updateEventsBadgeUI();
    renderFamilyEventsList();

    if (state.isFirebaseReady && state.eventsDbRef) {
      state.eventsDbRef.set(state.familyEvents);
    }
  }

  // --------------------------------------------------------------------------
  // 14. Family Albums & Memory Wall Vault
  // --------------------------------------------------------------------------
  const DEFAULT_FAMILY_MEMORIES = [
    {
      id: 'mem_1',
      category: 'celebrations',
      caption: 'فرحة الأعياد ولمة العائلة في بيت الوالد يحيي صبيح 🌸',
      imageUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=600&q=80',
      sender: 'يحيي صبيح (الوالد)',
      timestamp: Date.now() - 86400000 * 30
    },
    {
      id: 'mem_2',
      category: 'trips',
      caption: 'رحلتنا ونزهتنا العائلية السنوية في أحضان الطبيعة 🌲',
      imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80',
      sender: 'محمد يحيي صبيح',
      timestamp: Date.now() - 86400000 * 60
    },
    {
      id: 'mem_3',
      category: 'vintage',
      caption: 'صورة من الزمن الجميل تجمع الأبناء في الصغر ✨',
      imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80',
      sender: 'أم محمد (الوالدة)',
      timestamp: Date.now() - 86400000 * 120
    }
  ];

  function initFamilyMemories() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FAMILY_MEMORIES);
      if (saved) {
        state.familyMemories = JSON.parse(saved);
      } else {
        state.familyMemories = DEFAULT_FAMILY_MEMORIES;
        localStorage.setItem(STORAGE_KEYS.FAMILY_MEMORIES, JSON.stringify(state.familyMemories));
      }
    } catch(e){
      state.familyMemories = DEFAULT_FAMILY_MEMORIES;
    }
  }

  function renderFamilyAlbums(filter = 'all') {
    state.currentAlbumFilter = filter;
    if (!DOM.galleryGrid) return;
    DOM.galleryGrid.innerHTML = '';

    if (DOM.albumFilterBar) {
      DOM.albumFilterBar.querySelectorAll('.album-filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
      });
    }

    const filtered = filter === 'all' 
      ? state.familyMemories 
      : state.familyMemories.filter(m => m.category === filter);

    if (DOM.galleryAlbumCount) {
      DOM.galleryAlbumCount.textContent = state.familyMemories.length;
    }

    if (filtered.length === 0) {
      DOM.galleryGrid.innerHTML = `
        <div class="gallery-empty" style="grid-column: 1 / -1; padding: 30px;">
          <i class="fa-solid fa-photo-film" style="font-size: 2.5rem; color: var(--accent-color); margin-bottom: 12px;"></i>
          <p>لا توجد ذكريات في هذا الألبوم بعد. اضغط على "+ إضافة ذكرى جديدة" لإضافة أول صورة!</p>
        </div>
      `;
      return;
    }

    filtered.forEach(mem => {
      const card = document.createElement('div');
      card.className = 'family-memory-card';
      card.innerHTML = `
        <div class="memory-card-img-wrap">
          <img src="${mem.imageUrl}" alt="${escapeHTML(mem.caption || 'ذكرى عائلية')}" loading="lazy">
          <span class="memory-category-tag">${getAlbumCategoryLabel(mem.category)}</span>
        </div>
        <div class="memory-card-body">
          <p class="memory-caption">${escapeHTML(mem.caption || '')}</p>
          <div class="memory-meta">
            <span class="memory-sender"><i class="fa-regular fa-user"></i> ${escapeHTML(mem.sender || '')}</span>
            <span class="memory-date">${formatArabicTime(new Date(mem.timestamp))}</span>
          </div>
        </div>
      `;

      card.onclick = () => {
        const allImgs = filtered.map(m => ({
          url: m.imageUrl,
          sender: m.sender,
          time: formatArabicTime(new Date(m.timestamp))
        }));
        const idx = allImgs.findIndex(i => i.url === mem.imageUrl);
        openLightbox(mem.imageUrl, mem.sender, formatArabicTime(new Date(mem.timestamp)), allImgs, idx >= 0 ? idx : 0);
      };

      DOM.galleryGrid.appendChild(card);
    });
  }

  function getAlbumCategoryLabel(cat) {
    const labels = {
      trips: '🌲 رحلات ونزهات',
      vintage: '🕰️ الزمن الجميل',
      celebrations: '🎉 مناسبات وأعياد',
      daily: '☕ يوميات العائلة'
    };
    return labels[cat] || '📸 ذكريات';
  }

  function saveNewMemory() {
    const caption = (DOM.memoryCaptionInput ? DOM.memoryCaptionInput.value : '').trim();
    const category = DOM.memoryAlbumCategory ? DOM.memoryAlbumCategory.value : 'celebrations';
    const previewImg = DOM.memoryPreviewImg ? DOM.memoryPreviewImg.src : '';

    if (!previewImg || previewImg.includes('data:image/svg') || previewImg === window.location.href) {
      alert('يرجى اختيار صورة للذكرى العائلية.');
      return;
    }

    const newMem = {
      id: `mem_${Date.now()}`,
      category,
      caption: caption || 'ذكرى عائلية جميلة',
      imageUrl: previewImg,
      sender: state.currentUser,
      timestamp: Date.now()
    };

    state.familyMemories.unshift(newMem);
    localStorage.setItem(STORAGE_KEYS.FAMILY_MEMORIES, JSON.stringify(state.familyMemories));

    if (DOM.addMemoryModal) DOM.addMemoryModal.style.display = 'none';
    if (DOM.memoryCaptionInput) DOM.memoryCaptionInput.value = '';
    if (DOM.memoryPreviewImg) DOM.memoryPreviewImg.src = '';
    if (DOM.memoryDropzone) DOM.memoryDropzone.classList.remove('has-image');

    renderGalleryTab('albums');
    updateMediaCounts();
  }

  // --------------------------------------------------------------------------
  // 15. Lightbox Carousel & Slideshow
  // --------------------------------------------------------------------------
  function openLightbox(imgSrc, sender, time, imageList = [], currentIndex = 0) {
    state.lightboxImages = imageList && imageList.length > 0 
      ? imageList 
      : [{ url: imgSrc, sender: sender, time: time }];
    state.lightboxCurrentIndex = currentIndex >= 0 ? currentIndex : 0;

    showLightboxIndex(state.lightboxCurrentIndex);
    DOM.lightboxModal.style.display = 'flex';
  }

  function showLightboxIndex(idx) {
    if (!state.lightboxImages || state.lightboxImages.length === 0) return;
    if (idx < 0) idx = state.lightboxImages.length - 1;
    if (idx >= state.lightboxImages.length) idx = 0;

    state.lightboxCurrentIndex = idx;
    const item = state.lightboxImages[idx];

    DOM.lightboxImg.src = item.url;
    DOM.lightboxSender.textContent = item.sender || 'عضو العائلة';
    DOM.lightboxTime.textContent = item.time || '';
    DOM.lightboxDownloadBtn.href = item.url;

    // Show/hide prev/next buttons based on list length
    const hasMultiple = state.lightboxImages.length > 1;
    if (DOM.lightboxPrevBtn) DOM.lightboxPrevBtn.style.display = hasMultiple ? 'flex' : 'none';
    if (DOM.lightboxNextBtn) DOM.lightboxNextBtn.style.display = hasMultiple ? 'flex' : 'none';
  }

  function lightboxPrev() {
    showLightboxIndex(state.lightboxCurrentIndex - 1);
  }

  function lightboxNext() {
    showLightboxIndex(state.lightboxCurrentIndex + 1);
  }

  // --------------------------------------------------------------------------
  // 16. Media Gallery Modal Rendering
  // --------------------------------------------------------------------------
  function openMediaGallery(tab = 'images') {
    DOM.mediaGalleryModal.style.display = 'flex';
    renderGalleryTab(tab);
  }

  function updateMediaCounts() {
    const images = state.messages.filter(m => m.mediaType === 'image');
    const videos = state.messages.filter(m => m.mediaType === 'video' || m.youtubeId);
    const audios = state.messages.filter(m => m.mediaType === 'audio');
    const links = state.messages.filter(m => m.text && m.text.includes('http'));

    if (DOM.galleryImgCount) DOM.galleryImgCount.textContent = images.length;
    if (DOM.galleryAlbumCount) DOM.galleryAlbumCount.textContent = state.familyMemories.length;
    if (DOM.galleryVidCount) DOM.galleryVidCount.textContent = videos.length;
    if (DOM.galleryAudCount) DOM.galleryAudCount.textContent = audios.length;
    if (DOM.galleryLinkCount) DOM.galleryLinkCount.textContent = links.length;
  }

  function renderGalleryTab(tab) {
    DOM.galleryGrid.innerHTML = '';
    const tabs = DOM.mediaGalleryModal.querySelectorAll('.gallery-tab');
    tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tab));

    if (DOM.albumFilterBar) {
      DOM.albumFilterBar.style.display = tab === 'albums' ? 'flex' : 'none';
    }

    if (tab === 'albums') {
      renderFamilyAlbums(state.currentAlbumFilter || 'all');
    } else if (tab === 'images') {
      const images = state.messages.filter(m => m.mediaType === 'image');
      if (images.length === 0) {
        DOM.galleryGrid.innerHTML = '<div class="gallery-empty">لا توجد صور مشاركة حتى الآن</div>';
        return;
      }
      const allImgs = images.map(m => ({
        url: m.mediaUrl,
        sender: m.sender,
        time: formatArabicTime(new Date(m.timestamp))
      }));
      images.forEach((m, i) => {
        const card = document.createElement('div');
        card.className = 'gallery-item-card';
        card.innerHTML = `<img src="${m.mediaUrl}" alt="صورة">`;
        card.onclick = () => openLightbox(m.mediaUrl, m.sender, formatArabicTime(new Date(m.timestamp)), allImgs, i);
        DOM.galleryGrid.appendChild(card);
      });
    } else if (tab === 'videos') {
      const videos = state.messages.filter(m => m.mediaType === 'video' || m.youtubeId);
      if (videos.length === 0) {
        DOM.galleryGrid.innerHTML = '<div class="gallery-empty">لا توجد مقاطع فيديو حتى الآن</div>';
        return;
      }
      videos.forEach(m => {
        const card = document.createElement('div');
        card.className = 'gallery-item-card';
        if (m.youtubeId) {
          card.innerHTML = `<img src="https://img.youtube.com/vi/${m.youtubeId}/mqdefault.jpg" alt="YouTube Thumbnail">`;
        } else {
          card.innerHTML = `<video src="${m.mediaUrl}"></video>`;
        }
        DOM.galleryGrid.appendChild(card);
      });
    } else if (tab === 'audios') {
      const audios = state.messages.filter(m => m.mediaType === 'audio');
      if (audios.length === 0) {
        DOM.galleryGrid.innerHTML = '<div class="gallery-empty">لا توجد تسجيلات صوتية حتى الآن</div>';
        return;
      }
      audios.forEach(m => {
        const item = document.createElement('div');
        item.style.gridColumn = '1 / -1';
        item.style.backgroundColor = 'var(--bg-primary)';
        item.style.padding = '8px 12px';
        item.style.borderRadius = '8px';
        item.innerHTML = `
          <div style="font-size:0.8rem; margin-bottom:4px;"><strong>${escapeHTML(m.sender)}</strong> • ${formatArabicTime(new Date(m.timestamp))}</div>
          <audio controls src="${m.mediaUrl}" style="width:100%;"></audio>
        `;
        DOM.galleryGrid.appendChild(item);
      });
    } else if (tab === 'links') {
      const links = state.messages.filter(m => (m.text && m.text.includes('http')) || m.youtubeId);
      if (links.length === 0) {
        DOM.galleryGrid.innerHTML = '<div class="gallery-empty">لا توجد روابط حتى الآن</div>';
        return;
      }
      links.forEach(m => {
        const item = document.createElement('div');
        item.style.gridColumn = '1 / -1';
        item.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted);">${escapeHTML(m.sender)}:</div>${formatMessageText(m.text)}`;
        DOM.galleryGrid.appendChild(item);
      });
    }
  }

  // --------------------------------------------------------------------------
  // 11. Event Listeners & Interactions Setup
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // Message Form Submit & Send Button Click
    DOM.messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });

    DOM.sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sendMessage();
    });

    // Auto-expand Textarea on input
    DOM.messageInput.addEventListener('input', () => {
      DOM.messageInput.style.height = 'auto';
      DOM.messageInput.style.height = `${Math.min(DOM.messageInput.scrollHeight, 120)}px`;
    });

    // Submit on Enter key (Shift+Enter for new line)
    DOM.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // File Input Changes
    DOM.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    DOM.cameraInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    DOM.cancelAttachmentBtn.addEventListener('click', clearPendingAttachment);

    // Audio Voice Note Controls
    DOM.recordVoiceBtn.addEventListener('click', startAudioRecording);
    DOM.cancelRecordBtn.addEventListener('click', () => stopAudioRecording(false));
    DOM.sendRecordBtn.addEventListener('click', () => stopAudioRecording(true));

    // User Profile Switcher
    DOM.userProfileBtn.addEventListener('click', () => showUserSelectionModal(true));
    DOM.closeUserModalBtn.addEventListener('click', hideUserSelectionModal);

    // Avatar Customizer Events
    if (DOM.uploadAvatarBtn && DOM.avatarFileInput) {
      DOM.uploadAvatarBtn.addEventListener('click', () => DOM.avatarFileInput.click());
    }

    if (DOM.avatarFileInput) {
      DOM.avatarFileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          try {
            const dataUrl = await compressAndCropSquareImage(e.target.files[0], 200, 0.88);
            state.tempSelectedAvatar = dataUrl;
            updateAvatarPreviewUI(dataUrl, DOM.customNameInput ? DOM.customNameInput.value : state.currentUser);
            if (DOM.presetAvatarsDrawer) DOM.presetAvatarsDrawer.style.display = 'none';
          } catch (err) {
            console.warn('Avatar image compression error:', err);
          }
        }
      });
    }

    if (DOM.avatarCameraInput) {
      DOM.avatarCameraInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          try {
            const dataUrl = await compressAndCropSquareImage(e.target.files[0], 200, 0.88);
            state.tempSelectedAvatar = dataUrl;
            updateAvatarPreviewUI(dataUrl, DOM.customNameInput ? DOM.customNameInput.value : state.currentUser);
            if (DOM.presetAvatarsDrawer) DOM.presetAvatarsDrawer.style.display = 'none';
          } catch (err) {
            console.warn('Camera avatar compression error:', err);
          }
        }
      });
    }

    if (DOM.openCameraAvatarBtn) {
      DOM.openCameraAvatarBtn.addEventListener('click', openCameraSnapshotModal);
    }

    if (DOM.togglePresetAvatarsBtn && DOM.presetAvatarsDrawer) {
      DOM.togglePresetAvatarsBtn.addEventListener('click', () => {
        const isHidden = DOM.presetAvatarsDrawer.style.display === 'none' || !DOM.presetAvatarsDrawer.style.display;
        DOM.presetAvatarsDrawer.style.display = isHidden ? 'block' : 'none';
      });
    }

    if (DOM.closePresetAvatarsBtn && DOM.presetAvatarsDrawer) {
      DOM.closePresetAvatarsBtn.addEventListener('click', () => {
        DOM.presetAvatarsDrawer.style.display = 'none';
      });
    }

    if (DOM.removeAvatarBtn) {
      DOM.removeAvatarBtn.addEventListener('click', () => {
        state.tempSelectedAvatar = '';
        updateAvatarPreviewUI('', DOM.customNameInput ? DOM.customNameInput.value : state.currentUser);
      });
    }

    if (DOM.customNameInput) {
      DOM.customNameInput.addEventListener('input', () => {
        if (!state.tempSelectedAvatar) {
          updateAvatarPreviewUI('', DOM.customNameInput.value);
        }
      });
    }

    // Live Camera Snapshot Modal Events
    if (DOM.closeCameraModalBtn) {
      DOM.closeCameraModalBtn.addEventListener('click', closeCameraSnapshotModal);
    }
    if (DOM.cancelCameraBtn) {
      DOM.cancelCameraBtn.addEventListener('click', closeCameraSnapshotModal);
    }
    if (DOM.snapPhotoBtn) {
      DOM.snapPhotoBtn.addEventListener('click', snapPhoto);
    }
    if (DOM.retakePhotoBtn) {
      DOM.retakePhotoBtn.addEventListener('click', retakePhoto);
    }
    if (DOM.useCapturedPhotoBtn) {
      DOM.useCapturedPhotoBtn.addEventListener('click', useCapturedPhoto);
    }
    if (DOM.switchCameraFacingBtn) {
      DOM.switchCameraFacingBtn.addEventListener('click', switchCameraFacing);
    }

    if (DOM.openBulkFromUserModalBtn) {
      DOM.openBulkFromUserModalBtn.addEventListener('click', openBulkMembersModal);
    }

    if (DOM.familyRosterBtn) {
      DOM.familyRosterBtn.addEventListener('click', openBulkMembersModal);
    }

    // Bulk Family Members Modal
    if (DOM.closeBulkModalBtn) {
      DOM.closeBulkModalBtn.addEventListener('click', hideBulkMembersModal);
    }
    if (DOM.cancelBulkModalBtn) {
      DOM.cancelBulkModalBtn.addEventListener('click', hideBulkMembersModal);
    }
    if (DOM.bulkNamesTextarea) {
      DOM.bulkNamesTextarea.addEventListener('input', updateBulkPreviewFromInput);
    }
    if (DOM.loadSampleNamesBtn) {
      DOM.loadSampleNamesBtn.addEventListener('click', loadSampleFamilyNames);
    }
    if (DOM.clearBulkInputBtn) {
      DOM.clearBulkInputBtn.addEventListener('click', () => {
        DOM.bulkNamesTextarea.value = '';
        updateBulkPreviewFromInput();
        DOM.bulkNamesTextarea.focus();
      });
    }
    if (DOM.saveBulkNamesBtn) {
      DOM.saveBulkNamesBtn.addEventListener('click', saveBulkNames);
    }
    if (DOM.settingsManageBulkBtn) {
      DOM.settingsManageBulkBtn.addEventListener('click', openBulkMembersModal);
    }

    DOM.saveUserNameBtn.addEventListener('click', () => {
      const val = DOM.customNameInput.value;
      saveUserName(val);
    });

    DOM.customNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveUserName(DOM.customNameInput.value);
      }
    });

    // Quick Family Greeting Pills in Welcome Banner
    DOM.quickGreetingPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.greeting-pill');
      if (pill) {
        const greeting = pill.getAttribute('data-text');
        DOM.messageInput.value = greeting;
        sendMessage();
      }
    });

    // Quick Emoji Bar Chips
    DOM.quickEmojiBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.emoji-chip');
      if (chip) {
        const emoji = chip.getAttribute('data-emoji');
        DOM.messageInput.value += ` ${emoji} `;
        DOM.messageInput.focus();
      }
    });

    // Search Toggle
    DOM.searchToggleBtn.addEventListener('click', () => {
      const isVisible = DOM.searchBarContainer.style.display !== 'none';
      DOM.searchBarContainer.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        DOM.searchInput.focus();
      } else {
        DOM.searchInput.value = '';
        state.searchQuery = '';
        renderMessages();
      }
    });

    DOM.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      renderMessages();
    });

    DOM.clearSearchBtn.addEventListener('click', () => {
      DOM.searchInput.value = '';
      state.searchQuery = '';
      DOM.searchResultsCount.textContent = '';
      renderMessages();
    });

    // Chat Scrolling Navigation Handlers
    DOM.chatMain.addEventListener('scroll', updateScrollNavUI);

    if (DOM.scrollToTopBtn) {
      DOM.scrollToTopBtn.addEventListener('click', () => scrollToTop(true));
    }
    if (DOM.scrollStepUpBtn) {
      DOM.scrollStepUpBtn.addEventListener('click', () => scrollStep(-280));
    }
    if (DOM.scrollStepDownBtn) {
      DOM.scrollStepDownBtn.addEventListener('click', () => scrollStep(280));
    }
    if (DOM.scrollToBottomBtn) {
      DOM.scrollToBottomBtn.addEventListener('click', () => scrollToBottom(true));
    }

    // Keyboard Navigation for Quick Scrolling
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'PageUp') {
        e.preventDefault();
        scrollStep(-400);
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        scrollStep(400);
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToTop(true);
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollToBottom(true);
      }
    });

    // Delete Modal Events
    if (DOM.deleteSafetyCheck) {
      DOM.deleteSafetyCheck.addEventListener('change', (e) => {
        if (DOM.confirmDeleteBtn) {
          DOM.confirmDeleteBtn.disabled = !e.target.checked;
        }
      });
    }

    DOM.confirmDeleteBtn.addEventListener('click', confirmDeleteMessage);
    
    const hideDeleteModal = () => {
      DOM.deleteModal.style.display = 'none';
      state.selectedDeleteId = null;
      if (DOM.deleteSafetyCheck) DOM.deleteSafetyCheck.checked = false;
      if (DOM.confirmDeleteBtn) DOM.confirmDeleteBtn.disabled = true;
    };

    DOM.cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    if (DOM.closeDeleteModalBtn) {
      DOM.closeDeleteModalBtn.addEventListener('click', hideDeleteModal);
    }

    // Lightbox Modal
    DOM.closeLightboxBtn.addEventListener('click', () => {
      DOM.lightboxModal.style.display = 'none';
    });

    if (DOM.lightboxPrevBtn) {
      DOM.lightboxPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        lightboxPrev();
      });
    }

    if (DOM.lightboxNextBtn) {
      DOM.lightboxNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        lightboxNext();
      });
    }

    // Keyboard Arrow navigation for Lightbox
    window.addEventListener('keydown', (e) => {
      if (DOM.lightboxModal && DOM.lightboxModal.style.display === 'flex') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          if (e.key === 'ArrowRight') lightboxNext();
          else lightboxPrev();
        } else if (e.key === 'Escape') {
          DOM.lightboxModal.style.display = 'none';
        }
      }
    });

    // Pinned Announcements Listeners
    if (DOM.pinnedAnnouncementBtn) {
      DOM.pinnedAnnouncementBtn.addEventListener('click', openAnnouncementModal);
    }
    if (DOM.editAnnouncementBtn) {
      DOM.editAnnouncementBtn.addEventListener('click', openAnnouncementModal);
    }
    if (DOM.closeAnnouncementModalBtn) {
      DOM.closeAnnouncementModalBtn.addEventListener('click', () => {
        DOM.announcementModal.style.display = 'none';
      });
    }
    if (DOM.cancelAnnouncementBtn) {
      DOM.cancelAnnouncementBtn.addEventListener('click', () => {
        DOM.announcementModal.style.display = 'none';
      });
    }
    if (DOM.saveAnnouncementBtn) {
      DOM.saveAnnouncementBtn.addEventListener('click', savePinnedAnnouncement);
    }
    if (DOM.unpinAnnouncementBtn) {
      DOM.unpinAnnouncementBtn.addEventListener('click', unpinAnnouncement);
    }
    if (DOM.togglePinnedBannerBtn) {
      DOM.togglePinnedBannerBtn.addEventListener('click', () => {
        if (DOM.pinnedAnnouncementBanner) {
          DOM.pinnedAnnouncementBanner.classList.toggle('collapsed');
        }
      });
    }

    // Family Events & Calendar Listeners
    if (DOM.familyCalendarBtn) {
      DOM.familyCalendarBtn.addEventListener('click', () => {
        renderFamilyEventsList();
        DOM.eventsCalendarModal.style.display = 'flex';
      });
    }
    if (DOM.closeEventsModalBtn) {
      DOM.closeEventsModalBtn.addEventListener('click', () => {
        DOM.eventsCalendarModal.style.display = 'none';
      });
    }
    if (DOM.toggleAddEventFormBtn) {
      DOM.toggleAddEventFormBtn.addEventListener('click', () => {
        const isHidden = DOM.addEventFormCard.style.display === 'none' || !DOM.addEventFormCard.style.display;
        DOM.addEventFormCard.style.display = isHidden ? 'block' : 'none';
        if (isHidden && DOM.eventTitleInput) DOM.eventTitleInput.focus();
      });
    }
    if (DOM.cancelAddEventBtn) {
      DOM.cancelAddEventBtn.addEventListener('click', () => {
        DOM.addEventFormCard.style.display = 'none';
      });
    }
    if (DOM.saveNewEventBtn) {
      DOM.saveNewEventBtn.addEventListener('click', saveNewFamilyEvent);
    }

    // Family Polls Listeners
    if (DOM.createPollBtn) {
      DOM.createPollBtn.addEventListener('click', openPollCreateModal);
    }
    if (DOM.closePollModalBtn) {
      DOM.closePollModalBtn.addEventListener('click', () => {
        DOM.pollCreateModal.style.display = 'none';
      });
    }
    if (DOM.cancelPollBtn) {
      DOM.cancelPollBtn.addEventListener('click', () => {
        DOM.pollCreateModal.style.display = 'none';
      });
    }
    if (DOM.addPollOptionBtn) {
      DOM.addPollOptionBtn.addEventListener('click', addPollOptionInput);
    }
    if (DOM.submitPollBtn) {
      DOM.submitPollBtn.addEventListener('click', submitPoll);
    }

    // Family Albums & Memory Wall Listeners
    if (DOM.openAddMemoryModalBtn) {
      DOM.openAddMemoryModalBtn.addEventListener('click', () => {
        if (DOM.memoryCaptionInput) DOM.memoryCaptionInput.value = '';
        if (DOM.memoryPreviewImg) DOM.memoryPreviewImg.src = '';
        if (DOM.memoryDropzone) DOM.memoryDropzone.classList.remove('has-image');
        DOM.addMemoryModal.style.display = 'flex';
      });
    }
    if (DOM.closeAddMemoryModalBtn) {
      DOM.closeAddMemoryModalBtn.addEventListener('click', () => {
        DOM.addMemoryModal.style.display = 'none';
      });
    }
    if (DOM.cancelMemoryBtn) {
      DOM.cancelMemoryBtn.addEventListener('click', () => {
        DOM.addMemoryModal.style.display = 'none';
      });
    }
    if (DOM.saveMemoryBtn) {
      DOM.saveMemoryBtn.addEventListener('click', saveNewMemory);
    }
    if (DOM.memoryDropzone && DOM.memoryFileInput) {
      DOM.memoryDropzone.addEventListener('click', () => DOM.memoryFileInput.click());
    }
    if (DOM.memoryFileInput) {
      DOM.memoryFileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          try {
            const dataUrl = await compressAndCropSquareImage(e.target.files[0], 800, 0.9);
            if (DOM.memoryPreviewImg) DOM.memoryPreviewImg.src = dataUrl;
            if (DOM.memoryDropzone) DOM.memoryDropzone.classList.add('has-image');
          } catch(err) {
            console.warn('Memory image processing failed:', err);
          }
        }
      });
    }
    if (DOM.albumFilterBar) {
      DOM.albumFilterBar.addEventListener('click', (e) => {
        const pill = e.target.closest('.album-filter-pill');
        if (pill) {
          const filter = pill.getAttribute('data-filter') || 'all';
          renderFamilyAlbums(filter);
        }
      });
    }

    // Media Gallery Modal
    DOM.mediaGalleryBtn.addEventListener('click', () => openMediaGallery('albums'));
    DOM.closeGalleryModalBtn.addEventListener('click', () => {
      DOM.mediaGalleryModal.style.display = 'none';
    });

    DOM.mediaGalleryModal.querySelectorAll('.gallery-tab').forEach(tab => {
      tab.addEventListener('click', () => renderGalleryTab(tab.getAttribute('data-tab')));
    });

    // Settings Modal
    DOM.settingsBtn.addEventListener('click', () => {
      DOM.settingsModal.style.display = 'flex';
    });

    DOM.closeSettingsModalBtn.addEventListener('click', () => {
      DOM.settingsModal.style.display = 'none';
    });

    DOM.settingsChangeNameBtn.addEventListener('click', () => {
      DOM.settingsModal.style.display = 'none';
      showUserSelectionModal(true);
    });

    DOM.saveFbConfigBtn.addEventListener('click', () => {
      const newConfig = {
        apiKey: DOM.fbApiKey.value.trim(),
        databaseURL: DOM.fbDbUrl.value.trim(),
        storageBucket: DOM.fbStorageBucket.value.trim(),
        projectId: DOM.fbProjectId.value.trim()
      };
      localStorage.setItem(STORAGE_KEYS.FB_CONFIG, JSON.stringify(newConfig));
      alert('تم حفظ إعدادات Firebase بنجاح! سيتم إعادة تحميل الاتصال.');
      window.location.reload();
    });

    DOM.resetFbConfigBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEYS.FB_CONFIG);
      alert('تمت استعادة الإعدادات الافتراضية.');
      window.location.reload();
    });

    DOM.soundToggle.addEventListener('change', (e) => {
      state.soundEnabled = e.target.checked;
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, state.soundEnabled ? '1' : '0');
    });

    // Load sound preference
    const soundPref = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
    if (soundPref !== null) {
      state.soundEnabled = soundPref === '1';
      DOM.soundToggle.checked = state.soundEnabled;
    }

    // PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      state.deferredInstallPrompt = e;
      DOM.pwaInstallBtn.style.display = 'inline-flex';
      DOM.pwaBanner.style.display = 'flex';
    });

    const triggerPWAInstall = async () => {
      if (!state.deferredInstallPrompt) return;
      state.deferredInstallPrompt.prompt();
      const { outcome } = await state.deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        DOM.pwaBanner.style.display = 'none';
        DOM.pwaInstallBtn.style.display = 'none';
      }
      state.deferredInstallPrompt = null;
    };

    DOM.pwaInstallBtn.addEventListener('click', triggerPWAInstall);
    DOM.pwaBannerInstallBtn.addEventListener('click', triggerPWAInstall);
    DOM.pwaBannerDismissBtn.addEventListener('click', () => {
      DOM.pwaBanner.style.display = 'none';
    });

    // Drag & Drop media file onto chat area
    DOM.chatMain.addEventListener('dragover', (e) => {
      e.preventDefault();
      DOM.chatMain.style.backgroundColor = 'rgba(2, 132, 199, 0.08)';
    });

    DOM.chatMain.addEventListener('dragleave', () => {
      DOM.chatMain.style.backgroundColor = '';
    });

    DOM.chatMain.addEventListener('drop', (e) => {
      e.preventDefault();
      DOM.chatMain.style.backgroundColor = '';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    // Cross-tab and cross-window sync listener
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS.MESSAGES_CACHE || e.key === STORAGE_KEYS.SYNC_ACTION) {
        loadCachedMessages();
        renderMessages();
      } else if (e.key === STORAGE_KEYS.USER_NAME) {
        initUserSession();
      } else if (e.key === STORAGE_KEYS.FAMILY_MEMBERS) {
        loadFamilyMembers();
      } else if (e.key === STORAGE_KEYS.PINNED_ANNOUNCEMENT) {
        initPinnedAnnouncements();
      } else if (e.key === STORAGE_KEYS.FAMILY_EVENTS) {
        initFamilyEvents();
      } else if (e.key === STORAGE_KEYS.FAMILY_MEMORIES) {
        initFamilyMemories();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 17. PWA Service Worker Registration
  // --------------------------------------------------------------------------
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
          .catch((err) => console.warn('Service Worker registration warning:', err));
      });
    }
  }

  // --------------------------------------------------------------------------
  // 18. Application Bootstrap
  // --------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initUserSession();
    initFirebase();
    initPinnedAnnouncements();
    initFamilyEvents();
    initFamilyMemories();
    setupEventListeners();
    registerServiceWorker();

    // Scroll to bottom after initial load
    setTimeout(() => {
      scrollToBottom(false);
    }, 300);
  });

})();
