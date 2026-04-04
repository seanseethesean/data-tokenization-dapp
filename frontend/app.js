(function () {
	const state = {
		provider: null,
		signer: null,
		account: null,
		network: null,
		decimals: 18,
		contracts: {}
	};

	const ui = {
		connectBtn: document.getElementById("connectBtn"),
		walletAddress: document.getElementById("walletAddress"),
		tokenBalance: document.getElementById("tokenBalance"),
		networkName: document.getElementById("networkName"),
		log: document.getElementById("log"),
		submitDataForm: document.getElementById("submitDataForm"),
		approveSubmissionForm: document.getElementById("approveSubmissionForm"),
		createVoucherForm: document.getElementById("createVoucherForm"),
		approveSpendingForm: document.getElementById("approveSpendingForm"),
		redeemVoucherForm: document.getElementById("redeemVoucherForm")
	};

	function shortAddress(address) {
		if (!address) return "Not connected";
		return address.slice(0, 6) + "..." + address.slice(-4);
	}

	function appendLog(message, type) {
		const p = document.createElement("p");
		p.textContent = "[" + new Date().toLocaleTimeString() + "] " + message;
		if (type) p.classList.add(type);
		ui.log.prepend(p);
	}

	function requireConfig() {
		if (!window.CONTRACT_CONFIG) {
			throw new Error("Missing CONTRACT_CONFIG object in contractConfig.js");
		}

		const { dataTokenAddress, dataRewardsAddress, voucherRedemptionAddress } = window.CONTRACT_CONFIG;
		if (!dataTokenAddress || !dataRewardsAddress || !voucherRedemptionAddress) {
			throw new Error("Missing one or more contract addresses in contractConfig.js");
		}
	}

	function isMetaMaskAvailable() {
		return typeof window.ethereum !== "undefined";
	}

	async function connectWallet() {
		if (!isMetaMaskAvailable()) {
			throw new Error("MetaMask not detected. Please install MetaMask.");
		}

		requireConfig();
		await window.ethereum.request({ method: "eth_requestAccounts" });

		state.provider = new ethers.BrowserProvider(window.ethereum);
		state.signer = await state.provider.getSigner();
		state.account = await state.signer.getAddress();
		state.network = await state.provider.getNetwork();

		initContracts();
		state.decimals = await state.contracts.dataToken.decimals();

		ui.walletAddress.textContent = shortAddress(state.account);
		ui.networkName.textContent = state.network.name + " (chainId: " + state.network.chainId + ")";
		await refreshBalance();

		appendLog("Connected: " + state.account, "ok");
	}

	function initContracts() {
		const cfg = window.CONTRACT_CONFIG;

		state.contracts.dataToken = new ethers.Contract(
			cfg.dataTokenAddress,
			cfg.dataTokenAbi,
			state.signer
		);

		state.contracts.dataRewards = new ethers.Contract(
			cfg.dataRewardsAddress,
			cfg.dataRewardsAbi,
			state.signer
		);

		state.contracts.voucherRedemption = new ethers.Contract(
			cfg.voucherRedemptionAddress,
			cfg.voucherRedemptionAbi,
			state.signer
		);
	}

	async function refreshBalance() {
		if (!state.account || !state.contracts.dataToken) return;
		const rawBalance = await state.contracts.dataToken.balanceOf(state.account);
		ui.tokenBalance.textContent = ethers.formatUnits(rawBalance, state.decimals);
	}

	async function sendTx(actionLabel, txPromise) {
		const tx = await txPromise;
		appendLog(actionLabel + " submitted: " + tx.hash);
		await tx.wait();
		appendLog(actionLabel + " confirmed", "ok");
		await refreshBalance();
	}

	function readInput(form, selector) {
		return form.querySelector(selector).value.trim();
	}

	function parseTokenAmount(value) {
		if (!value || Number(value) <= 0) {
			throw new Error("Amount must be greater than 0");
		}
		return ethers.parseUnits(value, state.decimals);
	}

	async function handleSubmitData(event) {
		event.preventDefault();
		const dataURI = readInput(ui.submitDataForm, "#dataUri");
		const rewardAmount = parseTokenAmount(readInput(ui.submitDataForm, "#rewardAmount"));

		await sendTx(
			"submitData",
			state.contracts.dataRewards.submitData(dataURI, rewardAmount)
		);

		ui.submitDataForm.reset();
	}

	async function handleApproveSubmission(event) {
		event.preventDefault();
		const submissionId = readInput(ui.approveSubmissionForm, "#submissionId");

		await sendTx(
			"approveSubmission",
			state.contracts.dataRewards.approveSubmission(submissionId)
		);

		ui.approveSubmissionForm.reset();
	}

	async function handleCreateVoucher(event) {
		event.preventDefault();
		const name = readInput(ui.createVoucherForm, "#voucherName");
		const tokenCost = parseTokenAmount(readInput(ui.createVoucherForm, "#voucherCost"));

		await sendTx(
			"createVoucher",
			state.contracts.voucherRedemption.createVoucher(name, tokenCost)
		);

		ui.createVoucherForm.reset();
	}

	async function handleApproveSpending(event) {
		event.preventDefault();
		const amount = parseTokenAmount(readInput(ui.approveSpendingForm, "#approveAmount"));

		await sendTx(
			"approve(token)",
			state.contracts.dataToken.approve(window.CONTRACT_CONFIG.voucherRedemptionAddress, amount)
		);

		ui.approveSpendingForm.reset();
	}

	async function handleRedeemVoucher(event) {
		event.preventDefault();
		const voucherId = readInput(ui.redeemVoucherForm, "#redeemVoucherId");

		await sendTx(
			"redeemVoucher",
			state.contracts.voucherRedemption.redeemVoucher(voucherId)
		);

		ui.redeemVoucherForm.reset();
	}

	async function guardedAction(action) {
		if (!state.signer) {
			appendLog("Connect MetaMask first", "error");
			return;
		}

		try {
			await action();
		} catch (error) {
			const msg = error && error.shortMessage
				? error.shortMessage
				: (error && error.message ? error.message : "Transaction failed");
			appendLog(msg, "error");
		}
	}

	function bindEvents() {
		ui.connectBtn.addEventListener("click", async function () {
			try {
				await connectWallet();
			} catch (error) {
				appendLog(error.message || "Connection failed", "error");
			}
		});

		ui.submitDataForm.addEventListener("submit", function (event) {
			guardedAction(function () {
				return handleSubmitData(event);
			});
		});

		ui.approveSubmissionForm.addEventListener("submit", function (event) {
			guardedAction(function () {
				return handleApproveSubmission(event);
			});
		});

		ui.createVoucherForm.addEventListener("submit", function (event) {
			guardedAction(function () {
				return handleCreateVoucher(event);
			});
		});

		ui.approveSpendingForm.addEventListener("submit", function (event) {
			guardedAction(function () {
				return handleApproveSpending(event);
			});
		});

		ui.redeemVoucherForm.addEventListener("submit", function (event) {
			guardedAction(function () {
				return handleRedeemVoucher(event);
			});
		});

		if (window.ethereum) {
			window.ethereum.on("accountsChanged", function () {
				window.location.reload();
			});

			window.ethereum.on("chainChanged", function () {
				window.location.reload();
			});
		}
	}

	bindEvents();
})();
