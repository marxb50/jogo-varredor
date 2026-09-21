(() => {
	"use strict";

	const canvas = document.getElementById("canvas");
	const held = new Map();
	const pointerKeys = new Map();
	const keyData = {
		ArrowLeft: { action: "move_left", key: "ArrowLeft", keyCode: 37 },
		ArrowUp: { action: "jump", key: "ArrowUp", keyCode: 38 },
		ArrowRight: { action: "move_right", key: "ArrowRight", keyCode: 39 },
		ArrowDown: { action: "move_down", key: "ArrowDown", keyCode: 40 },
		Space: { action: "jump", key: " ", keyCode: 32 },
		KeyX: { action: "attack", key: "x", keyCode: 88 },
		KeyC: { action: "special_attack", key: "c", keyCode: 67 },
	};

	function dispatchKey(code, type) {
		const data = keyData[code];
		if (!canvas || !data) return;
		const isPressed = type === "keydown";

		if (typeof window.godotMobileInput === "function") {
			window.godotMobileInput(data.action, isPressed);
			canvas.focus({ preventScroll: true });
			return;
		}

		const event = new KeyboardEvent(type, {
			key: data.key,
			code,
			bubbles: true,
			cancelable: true,
		});

		for (const property of ["keyCode", "which"]) {
			try {
				Object.defineProperty(event, property, { get: () => data.keyCode });
			} catch (_) {
				// Modern browsers use key/code; these aliases help older Web exports.
			}
		}

		canvas.focus({ preventScroll: true });
		canvas.dispatchEvent(event);
	}

	function press(code) {
		const count = held.get(code) || 0;
		held.set(code, count + 1);
		if (count === 0) dispatchKey(code, "keydown");
	}

	function release(code) {
		const count = held.get(code) || 0;
		if (count <= 1) {
			held.delete(code);
			dispatchKey(code, "keyup");
		} else {
			held.set(code, count - 1);
		}
	}

	function releasePointer(pointerId) {
		const state = pointerKeys.get(pointerId);
		if (!state) return;
		state.keys.forEach(release);
		state.button.classList.remove("is-held");
		pointerKeys.delete(pointerId);
	}

	document.querySelectorAll("[data-keys]").forEach((button) => {
		button.addEventListener("pointerdown", (event) => {
			event.preventDefault();
			const keys = button.dataset.keys.split(",").filter(Boolean);
			pointerKeys.set(event.pointerId, { button, keys });
			button.classList.add("is-held");
			button.setPointerCapture?.(event.pointerId);
			keys.forEach(press);
		});

		for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
			button.addEventListener(type, (event) => {
				event.preventDefault();
				releasePointer(event.pointerId);
			});
		}
	});

	function releaseAll() {
		for (const code of held.keys()) dispatchKey(code, "keyup");
		held.clear();
		pointerKeys.clear();
		document.querySelectorAll(".is-held").forEach((element) => {
			element.classList.remove("is-held");
		});
	}

	document.addEventListener("visibilitychange", () => {
		if (document.hidden) releaseAll();
	});
	window.addEventListener("blur", releaseAll);
	document.addEventListener("contextmenu", (event) => event.preventDefault());
	document.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });

	const fullscreenButton = document.getElementById("fullscreen-button");
	fullscreenButton?.addEventListener("click", async () => {
		try {
			if (!document.fullscreenElement) {
				await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
				await screen.orientation?.lock?.("landscape");
			} else {
				await document.exitFullscreen?.();
			}
		} catch (_) {
			// iOS and some embedded browsers may decline fullscreen/orientation lock.
		}
		canvas?.focus({ preventScroll: true });
	});

	window.addEventListener("load", () => canvas?.focus({ preventScroll: true }));
})();
