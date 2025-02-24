let editor;
let synth;
let isPlaying = false;
let totalDuration = 0;
let currentTime = 0;
let playInterval;

// Initialize Monaco Editor
require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs",
  },
});

require(["vs/editor/editor.main"], function () {
  monaco.languages.register({
    id: "swavylang",
  });

  monaco.languages.setMonarchTokensProvider("swavylang", {
    tokenizer: {
      keywords: [
        {
          regex: /NOTE|SILENCE/,
          action: { token: "keyword" },
        },
        {
          regex: /NAME|ARTIST|ALBUMART/,
          action: { token: "variable" },
        }
      ],
    },
  });

  monaco.languages.registerCompletionItemProvider("swavylang", {
    provideCompletionItems: (model, position, context, token) => {
      return {
        suggestions: [
          {
            label: "NOTE",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "NOTE",
          },
          {
            label: "SILENCE",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "SILENCE",
          }
        ],
      };
    },
  });

  editor = monaco.editor.create(document.getElementById("editor"), {
    value: `NAME Example Song\nARTIST That team is SWAVY\nALBUMART default\nNOTE C4\nNOTE E4\nSILENCE 1\nNOTE G4\nSILENCE 2\nNOTE C5`,
    language: "swavylang",
    theme: "vs-dark",
    fontSize: 16,
    minimap: { enabled: false },
  });
});

document.getElementById("play").addEventListener("click", async () => {
  if (isPlaying) {
    // Pause the music
    isPlaying = false;
    clearInterval(playInterval);
    synth.triggerRelease();
    document.getElementById("play").innerHTML = '<i class="bi bi-play-circle-fill"></i>';
  } else {
    // Start audio context
    await Tone.start();

    const code = editor.getValue();
    const lines = code.split("\n");

    isPlaying = true;
    document.getElementById("play").innerHTML = '<i class="bi bi-pause-circle-fill"></i>';

    try {
      for (const line of lines) {
        if (!isPlaying) break;

        const [command, value] = line.trim().split(" ");

        switch (command) {
          case "NOTE":
            synth = new Tone.Synth().toDestination();
            synth.triggerAttackRelease(value, "8n");
            await new Promise((resolve) => setTimeout(resolve, 500));
            break;

          case "SILENCE":
            const duration = parseInt(value) * 500;
            await new Promise((resolve) => setTimeout(resolve, duration));
            break;

          case "NAME":
            document.querySelector("#title").textContent = line.replace("NAME ", "");
            break;
          case "ARTIST":
            document.querySelector("#artist").textContent = "By: " + line.replace("ARTIST ", "");
            break;
          case "ALBUMART":
            // To Be Implemented
            break;
          default:
            break;
        }
      }
    } catch (error) {
      console.error("Error playing music:", error);
    } finally {
      clearInterval(playInterval);
      isPlaying = false;
      document.getElementById("play").innerHTML = '<i class="bi bi-play-circle-fill"></i>';
    }
  }
});

document.querySelector(".dropdown-content a:nth-child(1)").addEventListener("click", saveFile);
document.querySelector(".dropdown-content a:nth-child(2)").addEventListener("click", loadFile);

function saveFile() {
  const content = editor.getValue();
  const titleMatch = content.match(/^NAME\s+(.+)$/m);
  const fileName = titleMatch ? `${titleMatch[1].trim().replaceAll(" ", "_")}.swavy` : "untitled.swavy";
  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
}

function loadFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".swavy";
  input.onchange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        editor.setValue(e.target.result);
      };
      reader.readAsText(file);
    }
  };
  input.click();
}