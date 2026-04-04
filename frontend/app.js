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
		runConversionForm: document.getElementById("runConversionForm"),
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

		console.log("[CONFIG] window.CONTRACT_CONFIG:", window.CONTRACT_CONFIG);

		const { dataTokenAddress, dataRewardsAddress, voucherRedemptionAddress } = window.CONTRACT_CONFIG;
		if (!dataTokenAddress || !dataRewardsAddress || !voucherRedemptionAddress) {
			throw new Error("Missing one or more contract addresses in contractConfig.js");
		}

		const cfg = window.CONTRACT_CONFIG;
		if (!Array.isArray(cfg.dataTokenAbi) || cfg.dataTokenAbi.length === 0) {
			throw new Error("dataTokenAbi is missing or empty in contractConfig.js");
		}

		if (!Array.isArray(cfg.dataRewardsAbi) || cfg.dataRewardsAbi.length === 0) {
			throw new Error("dataRewardsAbi is missing or empty in contractConfig.js");
		}

		if (!Array.isArray(cfg.voucherRedemptionAbi) || cfg.voucherRedemptionAbi.length === 0) {
			throw new Error("voucherRedemptionAbi is missing or empty in contractConfig.js");
		}

		console.log("[CONFIG] dataTokenAddress:", cfg.dataTokenAddress);
		console.log("[CONFIG] dataTokenAbi:", cfg.dataTokenAbi);
	}

	function isMetaMaskAvailable() {
		console.log("[ENV] window.ethereum exists:", typeof window.ethereum !== "undefined");
		return typeof window.ethereum !== "undefined";
	}

	async function assertTokenContractReadable() {
		const tokenAddress = window.CONTRACT_CONFIG.dataTokenAddress;
		const code = await state.provider.getCode(tokenAddress);
		console.log("[CHECK] provider.getCode(dataTokenAddress):", tokenAddress, code);

		if (!code || code === "0x") {
			throw new Error("No contract code found at dataTokenAddress on current MetaMask network");
		}

		try {
			const probe = await state.contracts.dataToken.decimals.staticCall();
			console.log("[CHECK] decimals.staticCall() returned:", probe.toString());
		} catch (error) {
			console.error("[CHECK] decimals.staticCall() failed", error);
			throw new Error("Failed to read decimals(). Check token address, ABI, and selected MetaMask network.");
		}
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
		console.log("[CONNECT] account:", state.account);
		console.log("[CONNECT] network:", state.network);

		const expectedChainId = window.CONTRACT_CONFIG.expectedChainId;
		if (expectedChainId && Number(state.network.chainId) !== Number(expectedChainId)) {
			throw new Error(
				"Wrong network in MetaMask. Expected chainId " + expectedChainId +
				", got " + state.network.chainId.toString()
			);
		}

		console.log("[CONNECT] calling initContracts()...");
		initContracts();
		await assertTokenContractReadable();
		console.log("[CONNECT] calling dataToken.decimals() on contract:", await state.contracts.dataToken.getAddress());
		state.decimals = await state.contracts.dataToken.decimals();
		console.log("[CONNECT] decimals:", state.decimals.toString());

		ui.walletAddress.textContent = shortAddress(state.account);
		ui.networkName.textContent = state.network.name + " (chainId: " + state.network.chainId + ")";
		await refreshBalance();

		appendLog("Connected: " + state.account, "ok");
	}

	function initContracts() {
		const cfg = window.CONTRACT_CONFIG;
		console.log("[INIT] constructing contracts with:", {
			dataTokenAddress: cfg.dataTokenAddress,
			dataRewardsAddress: cfg.dataRewardsAddress,
			voucherRedemptionAddress: cfg.voucherRedemptionAddress
		});

		state.contracts.dataToken = new ethers.Contract(
			cfg.dataTokenAddress,
			cfg.dataTokenAbi,
			state.signer
		);
		console.log("[INIT] dataToken contract target:", state.contracts.dataToken.target);

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
		console.log("[BALANCE] reading balanceOf for:", state.account);
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

	function parseMbAmount(value) {
		if (!value) {
			throw new Error("Unused MB is required");
		}

		const parsed = Number(value);
		if (!Number.isInteger(parsed) || parsed <= 0) {
			throw new Error("Unused MB must be a positive whole number");
		}

		return BigInt(parsed);
	}

	async function handleRunConversion(event) {
		event.preventDefault();
		const user = readInput(ui.runConversionForm, "#conversionUser");
		const unusedMb = parseMbAmount(readInput(ui.runConversionForm, "#unusedMb"));
		const billingMonth = readInput(ui.runConversionForm, "#billingMonth");
		const dataURI = readInput(ui.runConversionForm, "#conversionDataUri");

		if (!ethers.isAddress(user)) {
			throw new Error("Invalid user wallet address");
		}

		await sendTx(
			"convertUnusedData",
			state.contracts.dataRewards.convertUnusedData(user, unusedMb, billingMonth, dataURI)
		);

		ui.runConversionForm.reset();
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

		ui.runConversionForm.addEventListener("submit", function (event) {
			guardedAction(function () {
				return handleRunConversion(event);
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
