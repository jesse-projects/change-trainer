// ================================
// POCKETBASE CLIENT
// ================================

const pb = new PocketBase('https://apps.jesseprojects.com/api/changetrainer');

// Disable auto-cancellation (keeps requests alive during navigation)
pb.autoCancellation(false);

// ================================
// CHANGE TRAINER - MODE 1 & 2
// Calculate Change & Count Change
// ================================

class ChangeTrainer {
    // Game Constants
    static DEBUG = false; // Set to true for development logging
    static BILL_MIN = 1.00;
    static BILL_MAX = 98.99;
    static XP_MODE1_BASE = 10;
    static XP_MODE2_BASE = 15;
    static XP_HIDDEN_ONE_FIELD = 5;
    static XP_HIDDEN_BOTH_FIELDS = 15;
    static STREAK_MULTIPLIER_MAX = 3;
    static STREAK_THRESHOLD = 5;

    constructor() {
        // Game State
        this.currentProblem = null;
        this.userInputValue = '';
        this.totalXP = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.problemsSolved = 0;
        this.mode1Correct = 0;
        this.mode2Correct = 0;
        this.lastAnswerCorrect = false;

        // Mode Configuration
        this.mode = 1; // 1: Calculate, 2: Count Change
        this.modeDifficulty = 1; // Mode 1 = 1x, Mode 2 = 2x

        // Mode 2 State
        this.heldCurrency = []; // Array of {value, type} objects
        this.heldTotal = 0;
        this.isTotalHidden = false; // Persist hide state across problems
        this.isChangeDueHidden = false; // Persist hide state across problems
        this.pennyEnabled = true; // Toggle for penny (when false, round to nickel)
        this.soundEnabled = true; // Sound effects enabled

        // Auth State
        this.isAuthenticated = pb.authStore.isValid;
        this.currentUser = pb.authStore.model;

        // DOM Elements
        this.elements = {
            // Header
            menuBtn: document.getElementById('menuBtn'),
            streakBadge: document.getElementById('streakBadge'),

            // Problem display
            totalBill: document.getElementById('totalBill'),
            cashGiven: document.getElementById('cashGiven'),
            changeDueLabel: document.getElementById('changeDueLabel'),
            changeDue: document.getElementById('changeDue'),
            userInput: document.getElementById('userInput'),

            // Buttons
            submitBtn: document.getElementById('submitBtn'),
            newProblemBtn: document.getElementById('newProblemBtn'),

            // Feedback Modal
            feedbackModal: document.getElementById('feedbackModal'),
            stampEffect: document.getElementById('stampEffect'),
            modalMessage: document.getElementById('modalMessage'),
            modalXP: document.getElementById('modalXP'),
            modalClose: document.getElementById('modalClose'),

            // Stats Menu Modal
            statsModal: document.getElementById('statsModal'),
            menuMode: document.getElementById('menuMode'),
            menuXP: document.getElementById('menuXP'),
            menuStreak: document.getElementById('menuStreak'),
            menuBestStreak: document.getElementById('menuBestStreak'),
            statsClose: document.getElementById('statsClose'),
            createAccountLinkMenu: document.getElementById('createAccountLinkMenu'),
            accountStatus: document.getElementById('accountStatus'),
            pennyToggle: document.getElementById('pennyToggle'),
            soundToggle: document.getElementById('soundToggle'),

            // Mode 2 Elements
            inputDisplay: document.getElementById('inputDisplay'),
            numpad: document.getElementById('numpad'),
            holdingArea: document.getElementById('holdingArea'),
            holdingContent: document.getElementById('holdingContent'),
            holdingTotal: document.getElementById('holdingTotal'),
            clearHoldingBtn: document.getElementById('clearHoldingBtn'),
            virtualTill: document.getElementById('virtualTill'),

            // Auth Modal
            authModal: document.getElementById('authModal'),
            authForm: document.getElementById('authForm'),
            authModalTitle: document.getElementById('authModalTitle'),
            authUsername: document.getElementById('authUsername'),
            authEmail: document.getElementById('authEmail'),
            authPassword: document.getElementById('authPassword'),
            authSubmit: document.getElementById('authSubmit'),
            authToggleText: document.getElementById('authToggleText'),
            authToggleLink: document.getElementById('authToggleLink'),
            authCancel: document.getElementById('authCancel'),
            authError: document.getElementById('authError'),
            signInLinkMenu: document.getElementById('signInLinkMenu'),
            signOutLinkMenu: document.getElementById('signOutLinkMenu'),
            accountButtons: document.getElementById('accountButtons')
        };

        this.init();
    }

    async init() {
        // Load session data (includes mode preference)
        await this.loadSession();

        // Apply mode UI (after loading mode preference)
        this.applyModeUI();

        // Update UI
        this.updateUI();
        this.updateAuthUI();

        // Generate first problem
        this.generateProblem();

        // Event listeners
        this.attachEventListeners();
    }

    applyModeUI() {
        // Update mode buttons (hamburger menu)
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.mode) === this.mode);
        });

        // Update perforation switcher
        document.querySelectorAll('.mode-option').forEach(opt => {
            const optMode = parseInt(opt.dataset.mode);
            if (optMode === this.mode) {
                opt.classList.add('active');
                opt.classList.remove('inactive');
            } else {
                opt.classList.remove('active');
                opt.classList.add('inactive');
            }
        });

        if (this.mode === 1) {
            this.elements.inputDisplay.style.display = 'block';
            this.elements.numpad.style.display = 'grid';
            this.elements.holdingArea.style.display = 'none';
            this.elements.virtualTill.style.display = 'none';
            this.elements.changeDue.style.cursor = 'default';
            this.elements.changeDueLabel.textContent = 'CHANGE DUE';
            this.elements.changeDue.classList.remove('hidden');
        } else {
            this.elements.inputDisplay.style.display = 'none';
            this.elements.numpad.style.display = 'none';
            this.elements.holdingArea.style.display = 'block';
            this.elements.virtualTill.style.display = 'block';
            this.elements.changeDue.style.cursor = 'pointer';
            this.elements.changeDueLabel.textContent = 'CHANGE DUE (TAP TO HIDE):';
            // Apply saved hide states
            if (this.isChangeDueHidden) {
                this.elements.changeDue.classList.add('hidden');
            }
            if (this.isTotalHidden) {
                this.elements.holdingTotal.classList.add('hidden');
            }
        }

        this.updatePennyVisibility();
    }

    async loadSession() {
        if (this.isAuthenticated && this.currentUser) {
            // Logged in user - load from PocketBase
            try {
                const sanitizedUserId = this.escapeFilterValue(this.currentUser.id);
                const stats = await pb.collection('user_stats').getFirstListItem(
                    `user = "${sanitizedUserId}"`
                );

                this.totalXP = stats.total_xp || 0;
                this.currentStreak = stats.current_streak || 0;
                this.bestStreak = stats.best_streak || 0;
                this.problemsSolved = stats.problems_solved || 0;
                this.mode1Correct = stats.mode1_correct || 0;
                this.mode2Correct = stats.mode2_correct || 0;

                // Load settings (false in DB means the setting is "off")
                this.soundEnabled = !stats.sound_off;
                this.pennyEnabled = !stats.penny_off;
                // changeDue is top, holdingTotal is bottom
                this.isChangeDueHidden = stats.hide_top_total || false;
                this.isTotalHidden = stats.hide_bottom_total || false;

                // Load mode preference
                if (stats.mode_2) {
                    this.mode = 2;
                    this.modeDifficulty = 2;
                }

                // Apply settings to UI
                this.applySavedSettings();
            } catch (error) {
                // No stats record yet, create one
                if (error.status === 404) {
                    await pb.collection('user_stats').create({
                        user: this.currentUser.id,
                        total_xp: 0,
                        current_streak: 0,
                        best_streak: 0,
                        problems_solved: 0,
                        mode1_correct: 0,
                        mode2_correct: 0,
                        sound_off: false,
                        penny_off: false,
                        hide_top_total: false,
                        hide_bottom_total: false,
                        mode_2: false
                    });
                } else {
                    console.error('Error loading stats:', error);
                    this.loadLocalStorage(); // Fallback
                }
            }
        } else {
            // Anonymous user - load from browser localStorage
            this.loadLocalStorage();
        }
    }

    applySavedSettings() {
        // Apply sound setting
        if (typeof soundManager !== 'undefined') {
            soundManager.enabled = this.soundEnabled;
        }
        if (this.elements.soundToggle) {
            this.elements.soundToggle.checked = this.soundEnabled;
        }

        // Apply penny setting
        if (this.elements.pennyToggle) {
            this.elements.pennyToggle.checked = this.pennyEnabled;
        }
        this.updatePennyVisibility();

        // Apply hide states (will be applied when problem is generated)
        if (this.isTotalHidden && this.elements.holdingTotal) {
            this.elements.holdingTotal.classList.add('hidden');
        }
        if (this.isChangeDueHidden && this.elements.changeDue) {
            this.elements.changeDue.classList.add('hidden');
        }
    }

    loadLocalStorage() {
        const savedXP = localStorage.getItem('totalXP');
        const savedStreak = localStorage.getItem('currentStreak');
        const savedBestStreak = localStorage.getItem('bestStreak');
        const savedProblems = localStorage.getItem('problemsSolved');
        const savedMode1 = localStorage.getItem('mode1Correct');
        const savedMode2 = localStorage.getItem('mode2Correct');
        const savedSound = localStorage.getItem('soundEnabled');
        const savedPenny = localStorage.getItem('pennyEnabled');
        const savedTopHide = localStorage.getItem('isChangeDueHidden');
        const savedBottomHide = localStorage.getItem('isTotalHidden');
        const savedMode = localStorage.getItem('mode');

        if (savedXP) this.totalXP = parseInt(savedXP);
        if (savedStreak) this.currentStreak = parseInt(savedStreak);
        if (savedBestStreak) this.bestStreak = parseInt(savedBestStreak);
        if (savedProblems) this.problemsSolved = parseInt(savedProblems);
        if (savedMode1) this.mode1Correct = parseInt(savedMode1);
        if (savedMode2) this.mode2Correct = parseInt(savedMode2);
        if (savedSound !== null) this.soundEnabled = savedSound === 'true';
        if (savedPenny !== null) this.pennyEnabled = savedPenny === 'true';
        if (savedTopHide !== null) this.isChangeDueHidden = savedTopHide === 'true';
        if (savedBottomHide !== null) this.isTotalHidden = savedBottomHide === 'true';
        if (savedMode) {
            this.mode = parseInt(savedMode);
            this.modeDifficulty = this.mode;
        }

        this.applySavedSettings();
    }

    async saveSession() {
        if (this.isAuthenticated && this.currentUser) {
            // Logged in user - save to PocketBase
            try {
                const sanitizedUserId = this.escapeFilterValue(this.currentUser.id);
                const stats = await pb.collection('user_stats').getFirstListItem(
                    `user = "${sanitizedUserId}"`
                );

                await pb.collection('user_stats').update(stats.id, {
                    total_xp: this.totalXP,
                    current_streak: this.currentStreak,
                    best_streak: this.bestStreak,
                    problems_solved: this.problemsSolved,
                    mode1_correct: this.mode1Correct,
                    mode2_correct: this.mode2Correct,
                    sound_off: !this.soundEnabled,
                    penny_off: !this.pennyEnabled,
                    hide_top_total: this.isChangeDueHidden,
                    hide_bottom_total: this.isTotalHidden,
                    mode_2: this.mode === 2
                });
            } catch (error) {
                console.error('Error saving stats:', error);
                this.saveLocalStorage(); // Fallback
            }
        } else {
            // Anonymous user - save to browser localStorage
            this.saveLocalStorage();
        }
    }

    saveLocalStorage() {
        localStorage.setItem('totalXP', this.totalXP.toString());
        localStorage.setItem('currentStreak', this.currentStreak.toString());
        localStorage.setItem('bestStreak', this.bestStreak.toString());
        localStorage.setItem('problemsSolved', this.problemsSolved.toString());
        localStorage.setItem('mode1Correct', this.mode1Correct.toString());
        localStorage.setItem('mode2Correct', this.mode2Correct.toString());
        localStorage.setItem('soundEnabled', this.soundEnabled.toString());
        localStorage.setItem('pennyEnabled', this.pennyEnabled.toString());
        localStorage.setItem('isTotalHidden', this.isTotalHidden.toString());
        localStorage.setItem('isChangeDueHidden', this.isChangeDueHidden.toString());
        localStorage.setItem('mode', this.mode.toString());
    }

    updateUI() {
        // Update streak badge
        this.elements.streakBadge.textContent = `${this.currentStreak}🔥`;

        // Update stats menu
        this.elements.menuMode.textContent = this.mode === 1 ? 'CALCULATE' : 'COUNT CHANGE';
        this.elements.menuXP.textContent = this.totalXP.toString();
        this.elements.menuStreak.textContent = this.currentStreak.toString();
        this.elements.menuBestStreak.textContent = this.bestStreak.toString();
    }

    updateAuthUI() {
        if (this.isAuthenticated) {
            this.elements.accountStatus.textContent = `Signed in as: ${this.currentUser.username}`;
            this.elements.accountButtons.style.display = 'none';
            this.elements.signOutLinkMenu.style.display = 'block';
        } else {
            this.elements.accountStatus.textContent = 'Session progress is saved in your browser.';
            this.elements.accountButtons.style.display = 'flex';
            this.elements.signOutLinkMenu.style.display = 'none';
        }
    }

    generateProblem() {
        // Generate random bill amount
        const bill = (Math.random() * (ChangeTrainer.BILL_MAX - ChangeTrainer.BILL_MIN) + ChangeTrainer.BILL_MIN).toFixed(2);
        const billFloat = parseFloat(bill);

        // Generate realistic cash given amount
        const possibleCash = [];

        // Standard rounded amounts
        possibleCash.push(
            Math.ceil(billFloat),
            Math.ceil(billFloat / 5) * 5,
            Math.ceil(billFloat / 10) * 10,
            Math.ceil(billFloat / 20) * 20
        );

        // "Smart change" scenarios (same cents to get round change back)
        const cents = Math.round((billFloat % 1) * 100);
        if (cents > 0) {
            const nextRound5 = Math.ceil(billFloat / 5) * 5;
            const nextRound10 = Math.ceil(billFloat / 10) * 10;
            const nextRound20 = Math.ceil(billFloat / 20) * 20;

            possibleCash.push(
                nextRound5 + (cents / 100),
                nextRound10 + (cents / 100),
                nextRound20 + (cents / 100)
            );

            // Quarter-based amounts to minimize coins
            const quarterCents = Math.ceil(cents / 25) * 25;
            if (quarterCents <= 100) {
                possibleCash.push(
                    Math.floor(billFloat) + (quarterCents / 100)
                );
            }
        }

        // Select random cash amount
        const cash = possibleCash[Math.floor(Math.random() * possibleCash.length)].toFixed(2);

        // Calculate change
        let change = (parseFloat(cash) - billFloat).toFixed(2);

        // Round change to nearest nickel if pennies disabled
        if (!this.pennyEnabled) {
            const changeCents = Math.round(parseFloat(change) * 100);
            const roundedCents = Math.round(changeCents / 5) * 5;
            change = (roundedCents / 100).toFixed(2);

            // Adjust cash to match rounded change
            const adjustedCash = (billFloat + parseFloat(change)).toFixed(2);
            this.currentProblem = {
                bill: bill,
                cash: adjustedCash,
                change: change
            };
        } else {
            this.currentProblem = {
                bill: bill,
                cash: cash,
                change: change
            };
        }

        // Update UI
        this.elements.totalBill.textContent = `$${this.currentProblem.bill}`;
        this.elements.cashGiven.textContent = `$${this.currentProblem.cash}`;

        // Mode 2: Show change due immediately (user can hide it)
        // Mode 1: Hide change due until answer submitted
        if (this.mode === 2) {
            this.elements.changeDue.textContent = `$${this.currentProblem.change}`;
        } else {
            this.elements.changeDue.textContent = '$?.??';
        }

        // Reset user input
        this.userInputValue = '';
        this.elements.userInput.textContent = '$0.00';

        // Reset Mode 2 holding area
        this.heldCurrency = [];
        this.heldTotal = 0;
        this.updateHoldingArea();

        // Restore hide states
        if (this.isTotalHidden && this.elements.holdingTotal) {
            this.elements.holdingTotal.classList.add('hidden');
        }
        if (this.mode === 2 && this.isChangeDueHidden && this.elements.changeDue) {
            this.elements.changeDue.classList.add('hidden');
        }

        // Enable submit button
        this.elements.submitBtn.disabled = false;
    }

    handleNumpadInput(value) {
        // Play key tap sound
        if (typeof soundManager !== 'undefined') {
            soundManager.playKeyTap();
        }

        if (value === 'clear') {
            this.userInputValue = '';
            this.elements.userInput.textContent = '$0.00';
            return;
        }

        // Add digit or decimal
        if (value === '.' && this.userInputValue.includes('.')) return;

        this.userInputValue += value;

        // Format as currency
        const numValue = parseFloat(this.userInputValue || 0);
        this.elements.userInput.textContent = `$${numValue.toFixed(2)}`;
    }

    /// Mode 2: Holding area management
    addToHolding(value, type) {
        // Play appropriate sound
        if (typeof soundManager !== 'undefined') {
            if (type === 'bill') {
                soundManager.playBillTap();
            } else if (type === 'coin') {
                soundManager.playCoinTap();
            }
        }

        const amount = parseFloat(value);
        this.heldCurrency.push({ value: amount, type });
        this.heldTotal += amount;
        this.updateHoldingArea();
    }

    updateHoldingArea() {
        // Update visual display
        if (this.heldCurrency.length === 0) {
            this.elements.holdingContent.innerHTML = '<div class="empty-state">Tap denominations below</div>';
        } else {
            // Create visual bills and coins
            let html = '';
            this.heldCurrency.forEach(item => {
                const value = item.value.toFixed(2);
                const displayValue = item.type === 'bill'
                    ? `$${parseFloat(value).toFixed(0)}`
                    : `${Math.round(parseFloat(value) * 100)}¢`;

                html += `<div class="held-${item.type}" data-value="${value}">${displayValue}</div>`;
            });
            this.elements.holdingContent.innerHTML = html;
        }

        // Update total
        this.elements.holdingTotal.textContent = `$${this.heldTotal.toFixed(2)}`;
    }

    clearHolding() {
        this.heldCurrency = [];
        this.heldTotal = 0;
        this.updateHoldingArea();
    }

    checkAnswer() {
        const correctAnswer = parseFloat(this.currentProblem.change);
        let userAnswer;

        if (this.mode === 1) {
            userAnswer = parseFloat(this.userInputValue || 0);
        } else {
            userAnswer = this.heldTotal;
        }

        const tolerance = 0.001; // Allow for floating point rounding
        const isCorrect = Math.abs(userAnswer - correctAnswer) < tolerance;

        if (isCorrect) {
            // Show correct answer on correct answers
            this.elements.changeDue.textContent = `$${correctAnswer.toFixed(2)}`;
            if (this.mode === 1) {
                this.elements.changeDue.classList.remove('hidden');
                this.isChangeDueHidden = false;
            }
            // Disable submit button
            this.elements.submitBtn.disabled = true;

            this.handleCorrectAnswer();
        } else {
            // Don't show answer on wrong guess - let them try again
            this.handleIncorrectAnswer(correctAnswer);
        }
    }

    handleCorrectAnswer() {
        this.lastAnswerCorrect = true;

        // Play success sound
        if (typeof soundManager !== 'undefined') {
            soundManager.playSuccess();
        }

        // Calculate XP
        let baseXP = this.mode === 1 ? ChangeTrainer.XP_MODE1_BASE : ChangeTrainer.XP_MODE2_BASE;

        // Difficulty bonus for hiding fields (Mode 2 only)
        let difficultyBonus = 0;
        let bonusText = '';
        if (this.mode === 2) {
            const hiddenCount = (this.isTotalHidden ? 1 : 0) + (this.isChangeDueHidden ? 1 : 0);
            if (hiddenCount === 1) {
                difficultyBonus = ChangeTrainer.XP_HIDDEN_ONE_FIELD;
                bonusText = `👁️ +${ChangeTrainer.XP_HIDDEN_ONE_FIELD} XP HIDDEN FIELD`;
            } else if (hiddenCount === 2) {
                difficultyBonus = ChangeTrainer.XP_HIDDEN_BOTH_FIELDS;
                bonusText = `👁️👁️ +${ChangeTrainer.XP_HIDDEN_BOTH_FIELDS} XP BOTH HIDDEN`;
            }
        }

        const streakMultiplier = Math.min(
            Math.floor(this.currentStreak / ChangeTrainer.STREAK_THRESHOLD) + 1,
            ChangeTrainer.STREAK_MULTIPLIER_MAX
        );
        const xpEarned = (baseXP + difficultyBonus) * streakMultiplier;

        // Update stats
        this.totalXP += xpEarned;
        this.currentStreak += 1;
        if (this.currentStreak > this.bestStreak) {
            this.bestStreak = this.currentStreak;
        }
        this.problemsSolved += 1;
        if (this.mode === 1) {
            this.mode1Correct += 1;
        } else {
            this.mode2Correct += 1;
        }

        // Save session
        this.saveSession();

        // Update UI
        this.updateUI();

        // Show feedback
        let message = 'CORRECT!';
        if (bonusText) {
            message += `<br><span style="font-size: 0.75rem; color: #9b59b6;">${bonusText}</span>`;
        }
        if (streakMultiplier > 1) {
            message += `<br><span style="font-size: 0.875rem;">🔥 ${streakMultiplier}x STREAK BONUS</span>`;
        }

        this.showFeedback(true, message, xpEarned);
    }

    handleIncorrectAnswer(correctAnswer) {
        this.lastAnswerCorrect = false;

        // Play error sound
        if (typeof soundManager !== 'undefined') {
            soundManager.playError();
        }

        // Reset streak
        this.currentStreak = 0;

        // Re-enable submit button so they can try again
        this.elements.submitBtn.disabled = false;

        // Save session
        this.saveSession();

        // Update UI
        this.updateUI();

        // Show feedback with hint
        const difference = Math.abs(parseFloat(this.userInputValue || 0) - correctAnswer);
        let hint = '';

        if (difference > 1) {
            hint = 'Try breaking down the problem: subtract the bill from the cash given.';
        } else if (difference > 0.25) {
            hint = 'You\'re close! Double-check your cents calculation.';
        } else {
            hint = 'Almost there! Check your decimal place.';
        }

        this.showFeedback(false, `Incorrect.<br><br>${hint}`);
    }

    showFeedback(isCorrect, message, xpEarned = 0) {
        // Update modal content
        this.elements.stampEffect.className = `stamp ${isCorrect ? 'correct' : 'incorrect'}`;
        this.elements.stampEffect.textContent = isCorrect ? '✓' : '✗';
        this.elements.modalMessage.innerHTML = message;
        this.elements.modalXP.textContent = xpEarned > 0 ? `+${xpEarned} XP` : '';

        // Show modal
        this.elements.feedbackModal.style.display = 'flex';
    }

    attachEventListeners() {
        // Menu button
        this.elements.menuBtn.addEventListener('click', () => {
            if (typeof soundManager !== 'undefined') {
                soundManager.playUITap();
            }
            this.openStatsMenu();
        });

        // Mode selector (hamburger menu)
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!btn.classList.contains('active')) {
                    if (typeof soundManager !== 'undefined') {
                        soundManager.playUITap();
                    }
                    const mode = parseInt(btn.dataset.mode);
                    this.switchMode(mode);
                }
            });
        });

        // Perforation mode switcher (always visible)
        const modeSwitcher = document.getElementById('modeSwitcher');
        if (modeSwitcher) {
            const modeLabels = modeSwitcher.querySelector('.mode-labels');
            modeLabels.addEventListener('click', () => {
                if (typeof soundManager !== 'undefined') {
                    soundManager.playUITap();
                }
                const newMode = this.mode === 1 ? 2 : 1;
                this.switchMode(newMode);
            });
        }

        // Submit answer
        this.elements.submitBtn.addEventListener('click', () => {
            this.checkAnswer();
        });

        // New problem
        this.elements.newProblemBtn.addEventListener('click', () => {
            this.generateProblem();
        });

        // Numpad
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = btn.dataset.num;
                const action = btn.dataset.action;
                this.handleNumpadInput(action || num);
            });
        });

        // Virtual till buttons (Mode 2)
        document.querySelectorAll('.bill-btn, .coin-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.dataset.value;
                const type = btn.dataset.type;
                this.addToHolding(value, type);
            });
        });

        // Clear holding button
        this.elements.clearHoldingBtn.addEventListener('click', () => {
            this.clearHolding();
        });

        // Modal close buttons
        this.elements.modalClose.addEventListener('click', () => {
            this.elements.feedbackModal.style.display = 'none';
            // Only generate new problem if the last answer was correct
            if (this.lastAnswerCorrect) {
                this.generateProblem();
            }
        });

        this.elements.statsClose.addEventListener('click', () => {
            this.elements.statsModal.style.display = 'none';
        });

        // Close modals on backdrop click
        this.elements.feedbackModal.addEventListener('click', (e) => {
            if (e.target === this.elements.feedbackModal) {
                this.elements.feedbackModal.style.display = 'none';
                // Only generate new problem if the last answer was correct
                if (this.lastAnswerCorrect) {
                    this.generateProblem();
                }
            }
        });

        this.elements.statsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.statsModal) {
                this.elements.statsModal.style.display = 'none';
            }
        });

        this.elements.authModal.addEventListener('click', (e) => {
            if (e.target === this.elements.authModal) {
                this.elements.authModal.style.display = 'none';
            }
        });

        // Tap to hide functionality
        this.elements.holdingTotal.addEventListener('click', () => {
            this.isTotalHidden = !this.isTotalHidden;
            this.elements.holdingTotal.classList.toggle('hidden');
            this.saveSession(); // Save hide state
        });

        this.elements.changeDue.addEventListener('click', () => {
            // Only allow hiding in Mode 2
            if (this.mode === 2) {
                this.isChangeDueHidden = !this.isChangeDueHidden;
                this.elements.changeDue.classList.toggle('hidden');
                this.saveSession(); // Save hide state
            }
        });

        // Penny toggle
        this.elements.pennyToggle.addEventListener('change', (e) => {
            this.pennyEnabled = e.target.checked;
            this.updatePennyVisibility();
            this.generateProblem(); // Generate new problem with penny setting
            this.saveSession(); // Save setting
        });

        // Sound toggle
        this.elements.soundToggle.addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
            if (typeof soundManager !== 'undefined') {
                soundManager.enabled = this.soundEnabled;
                // Play a test sound when enabling
                if (this.soundEnabled) {
                    soundManager.playUITap();
                }
            }
            this.saveSession(); // Save setting
        });

        // Auth modal - create account
        this.elements.createAccountLinkMenu.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthModal('register');
            this.elements.statsModal.style.display = 'none';
        });

        // Auth modal - sign in
        this.elements.signInLinkMenu.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthModal('login');
            this.elements.statsModal.style.display = 'none';
        });

        // Sign out
        this.elements.signOutLinkMenu.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Auth form handlers
        this.elements.authToggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            const isRegister = this.elements.authForm.dataset.mode === 'register';
            this.showAuthModal(isRegister ? 'login' : 'register');
        });

        this.elements.authCancel.addEventListener('click', () => {
            this.elements.authModal.style.display = 'none';
        });

        this.elements.authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mode = this.elements.authForm.dataset.mode;
            const username = this.elements.authUsername.value;
            const password = this.elements.authPassword.value;

            try {
                if (mode === 'register') {
                    await this.register(username, password);
                } else {
                    await this.login(username, password);
                }
                this.elements.authModal.style.display = 'none';
                this.elements.statsModal.style.display = 'none';
            } catch (error) {
                this.showAuthError(error.message);
            }
        });
    }

    openStatsMenu() {
        this.updateUI();
        this.elements.statsModal.style.display = 'flex';
    }

    switchMode(newMode) {
        this.mode = newMode;
        this.modeDifficulty = newMode;

        // Update mode buttons (hamburger menu)
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.mode) === newMode);
        });

        // Update perforation switcher
        document.querySelectorAll('.mode-option').forEach(opt => {
            const optMode = parseInt(opt.dataset.mode);
            if (optMode === newMode) {
                opt.classList.add('active');
                opt.classList.remove('inactive');
            } else {
                opt.classList.remove('active');
                opt.classList.add('inactive');
            }
        });

        // Update display
        if (newMode === 1) {
            // Mode 1: Calculate Change
            this.elements.inputDisplay.style.display = 'block';
            this.elements.numpad.style.display = 'grid';
            this.elements.holdingArea.style.display = 'none';
            this.elements.virtualTill.style.display = 'none';
            this.elements.changeDue.style.cursor = 'default';
            this.elements.changeDueLabel.textContent = 'CHANGE DUE';
            // Always show in Mode 1 (don't reset the saved hide state)
            this.elements.changeDue.classList.remove('hidden');
        } else {
            // Mode 2: Count Change
            this.elements.inputDisplay.style.display = 'none';
            this.elements.numpad.style.display = 'none';
            this.elements.holdingArea.style.display = 'block';
            this.elements.virtualTill.style.display = 'block';
            this.elements.changeDue.style.cursor = 'pointer';
            this.elements.changeDueLabel.textContent = 'CHANGE DUE (TAP TO HIDE):';
            // Restore saved hide states for Mode 2
            if (this.isChangeDueHidden) {
                this.elements.changeDue.classList.add('hidden');
            } else {
                this.elements.changeDue.classList.remove('hidden');
            }
            if (this.isTotalHidden) {
                this.elements.holdingTotal.classList.add('hidden');
            } else {
                this.elements.holdingTotal.classList.remove('hidden');
            }
        }

        // Update penny visibility
        this.updatePennyVisibility();

        // Update stats and generate new problem
        this.updateUI();
        this.generateProblem();

        // Save mode preference
        this.saveSession();
    }

    updatePennyVisibility() {
        const pennyBtn = document.querySelector('.coin-penny');
        if (pennyBtn) {
            pennyBtn.style.display = this.pennyEnabled ? 'flex' : 'none';
        }
    }

    // Auth methods
    showAuthModal(mode) {
        this.elements.authForm.dataset.mode = mode;
        this.elements.authError.style.display = 'none';
        this.elements.authForm.reset();

        const privacyNotice = document.querySelector('.privacy-notice');
        const requirementsNotice = document.querySelector('.requirements-notice');
        const emailRow = this.elements.authEmail.closest('.form-row');
        const usernameLabel = document.getElementById('authUsernameLabel');
        const usernameRow = this.elements.authUsername.closest('.form-row');

        if (mode === 'register') {
            this.elements.authModalTitle.textContent = 'CREATE ACCOUNT';
            this.elements.authSubmit.textContent = 'CREATE ACCOUNT';
            this.elements.authToggleText.textContent = 'Already have an account?';
            this.elements.authToggleLink.textContent = 'Sign in';
            if (privacyNotice) privacyNotice.style.display = 'block';
            if (requirementsNotice) requirementsNotice.style.display = 'block';
            if (emailRow) emailRow.style.display = 'block';
            if (usernameLabel) usernameLabel.textContent = 'USERNAME';
            if (usernameRow) usernameRow.style.display = 'block';
            this.elements.authEmail.required = true;
            this.elements.authUsername.required = true;
            this.elements.authUsername.type = 'text';
        } else {
            this.elements.authModalTitle.textContent = 'SIGN IN';
            this.elements.authSubmit.textContent = 'SIGN IN';
            this.elements.authToggleText.textContent = "Don't have an account?";
            this.elements.authToggleLink.textContent = 'Create one';
            if (privacyNotice) privacyNotice.style.display = 'none';
            if (requirementsNotice) requirementsNotice.style.display = 'none';
            if (emailRow) emailRow.style.display = 'none';
            if (usernameLabel) usernameLabel.textContent = 'EMAIL OR USERNAME';
            if (usernameRow) usernameRow.style.display = 'block';
            this.elements.authEmail.required = false;
            this.elements.authUsername.required = true;
            this.elements.authUsername.type = 'text';
        }

        this.elements.authModal.style.display = 'flex';
    }

    showAuthError(message) {
        this.elements.authError.textContent = message;
        this.elements.authError.style.display = 'block';
    }

    // ================================
    // VALIDATION HELPERS
    // ================================

    validateUsername(username) {
        if (!username || username.length < 3 || username.length > 20) {
            return 'Username must be 3-20 characters';
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return 'Username can only contain letters, numbers, and underscores';
        }
        return null; // Valid
    }

    validateEmail(email) {
        if (!email) {
            return 'Email is required';
        }
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return 'Invalid email format';
        }
        return null; // Valid
    }

    validatePassword(password) {
        if (!password || password.length < 8) {
            return 'Password must be at least 8 characters';
        }
        if (!/[A-Za-z]/.test(password)) {
            return 'Password must contain at least one letter';
        }
        if (!/[0-9]/.test(password)) {
            return 'Password must contain at least one number';
        }
        return null; // Valid
    }

    // Escape user input for PocketBase filters to prevent injection
    escapeFilterValue(value) {
        if (!value) return '';
        // Escape quotes and backslashes
        return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    // Debug logging wrapper (only logs if DEBUG is true)
    log(...args) {
        if (ChangeTrainer.DEBUG) {
            console.log(...args);
        }
    }

    // ================================
    // AUTHENTICATION
    // ================================

    async register(username, password) {
        try {
            const email = this.elements.authEmail.value;

            // Validate input
            const usernameError = this.validateUsername(username);
            if (usernameError) {
                throw new Error(usernameError);
            }

            const emailError = this.validateEmail(email);
            if (emailError) {
                throw new Error(emailError);
            }

            const passwordError = this.validatePassword(password);
            if (passwordError) {
                throw new Error(passwordError);
            }

            this.log('Creating user:', username, email);
            // Create user
            const user = await pb.collection('users').create({
                username: username,
                email: email,
                emailVisibility: true,
                password: password,
                passwordConfirm: password
            });
            this.log('User created:', user.id);

            // Create stats record with current session data
            this.log('Creating user stats for:', user.id);
            await pb.collection('user_stats').create({
                user: user.id,
                total_xp: this.totalXP,
                current_streak: this.currentStreak,
                best_streak: this.bestStreak,
                problems_solved: this.problemsSolved,
                mode1_correct: this.mode1Correct,
                mode2_correct: this.mode2Correct,
                sound_off: !this.soundEnabled,
                penny_off: !this.pennyEnabled,
                hide_top_total: this.isChangeDueHidden,
                hide_bottom_total: this.isTotalHidden,
                mode_2: this.mode === 2
            });
            this.log('User stats created successfully');

            // Auto-login with email (PocketBase identity field)
            this.log('Attempting auto-login with email:', email);
            await this.login(email, password);
        } catch (error) {
            console.error('Registration error details:', error);
            throw new Error(error.message || 'Registration failed');
        }
    }

    async login(emailOrUsername, password) {
        try {
            // PocketBase requires email for auth, but we'll accept username too for UX
            let loginIdentifier = emailOrUsername;

            // If it looks like a username (no @), try to find the user's email
            if (!emailOrUsername.includes('@')) {
                this.log('Username provided, looking up email for:', emailOrUsername);
                try {
                    // Sanitize username to prevent filter injection
                    const sanitizedUsername = this.escapeFilterValue(emailOrUsername);
                    const users = await pb.collection('users').getFullList({
                        filter: `username = "${sanitizedUsername}"`
                    });
                    if (users.length > 0) {
                        loginIdentifier = users[0].email;
                        this.log('Found email for username:', loginIdentifier);
                    }
                } catch (lookupError) {
                    console.error('Username lookup failed:', lookupError);
                }
            }

            await pb.collection('users').authWithPassword(loginIdentifier, password);
            this.isAuthenticated = true;
            this.currentUser = pb.authStore.model;

            // Load user stats
            await this.loadSession();
            this.updateUI();
            this.updateAuthUI();

            // Play success sound
            if (typeof soundManager !== 'undefined') {
                soundManager.playSuccess();
            }
        } catch (error) {
            console.error('Login error details:', error);
            throw new Error(error.message || 'Invalid email/username or password');
        }
    }

    logout() {
        pb.authStore.clear();
        this.isAuthenticated = false;
        this.currentUser = null;

        // Reset to session storage
        this.loadLocalStorage();
        this.updateUI();
        this.updateAuthUI();
    }
}

// Initialize app
const app = new ChangeTrainer();
