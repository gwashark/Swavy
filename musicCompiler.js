let editor;
let synth;
let isPlaying = false;
let totalDuration = 0;
let currentTime = 0;
let playInterval;
let isPlayable = true

// Initialize Monaco Editor
require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs",
  },
});

require(["vs/editor/editor.main"], function () {
  // https://microsoft.github.io/monaco-editor/playground.html?source=v0.52.2#example-extending-language-services-model-markers-example
  function validator(model) {
    document.querySelector("#play").style.opacity = 1
    isPlayable = true
    const markers = [];
    for (let i = 1; i < model.getLineCount() + 1; i++) {
      const range = {
        startLineNumber: i,
        startColumn: 1,
        endLineNumber: i,
        endColumn: model.getLineLength(i) + 1,
      };
      const content = model.getValueInRange(range).trim()
      if (content.startsWith("NAME")) {
        if (content.split(" ").length == 1) markers.push({
          message: "The Song Should have a Name!",
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: range.startLineNumber,
          startColumn: range.startColumn,
          endLineNumber: range.endLineNumber,
          endColumn: range.endColumn,
        })
        const songName = content.replace("NAME","") || "Untitled"
        document.querySelector("#title").innerText = songName;
        document.title = songName + " - Swavy Music Editor"
      } else if (content.startsWith("ARTIST")) {
        if (content.split(" ").length == 1) markers.push({
          message: "The Song Should have an Artist Name!",
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: range.startLineNumber,
          startColumn: range.startColumn,
          endLineNumber: range.endLineNumber,
          endColumn: range.endColumn,
        })
        const artistName = content.replace("ARTIST", "") || "Unknown"
        document.querySelector("#artist").innerText = artistName;
      } else if (content.startsWith("NOTE")) {
        if (content.split(" ").length == 1) {
          isPlayable = false
          markers.push({
            message: "Incomplete Note.",
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: range.startLineNumber,
            startColumn: range.startColumn,
            endLineNumber: range.endLineNumber,
            endColumn: range.endColumn,
          })
        } else {
          if (!Tone.isNote(content.replace("NOTE ", ""))) {
            isPlayable = false
            markers.push({
              message: "Parameter of NOTE isn't valid.",
              severity: monaco.MarkerSeverity.Error,
              startLineNumber: range.startLineNumber,
              startColumn: range.startColumn,
              endLineNumber: range.endLineNumber,
              endColumn: range.endColumn,
            })
          }
        }
      } else if (content.startsWith("SILENCE")) {
        if (content.split(" ").length == 1) {
          isPlayable = false
          markers.push({
            message: "Incomplete Silence.",
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: range.startLineNumber,
            startColumn: range.startColumn,
            endLineNumber: range.endLineNumber,
            endColumn: range.endColumn,
          })
        }
      }
    }
    monaco.editor.setModelMarkers(model, "owner", markers);
    if (!isPlayable) document.querySelector("#play").style.opacity = 0.8
  }

  monaco.editor.defineTheme("swavytheme", {
    base: "vs-dark",
	  inherit: true,
    rules: [],
    colors: {
      "editor.lineHighlightBackground": "#454545",
      "editorLineNumber.foreground": "#59a1ff"
    }
  })

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
    provideCompletionItems: (model, position) => {
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
          },
          {
            label: "NAME",
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: "NAME"
          },
          {
            label: "ARTIST",
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: "ARTIST"
          }
        ],
      };
    },
  });

  monaco.languages.registerHoverProvider("swavylang", {
    provideHover: function (model, position) {
      // https://microsoft.github.io/monaco-editor/playground.html?source=v0.52.2#example-extending-language-services-hover-provider-example
      const contents = []
      return {
        range: new monaco.Range(
					1,
					1,
					model.getLineCount(),
					model.getLineMaxColumn(model.getLineCount())
				),
        contents
      }
    }
  })

  const model = monaco.editor.createModel("NAME Example Song\nARTIST Swavy Music Editor\n\nNOTE C4\nNOTE E4\nSILENCE 1\nNOTE G4\nSILENCE 2\nNOTE C5", "swavylang")

  editor = monaco.editor.create(document.getElementById("editor"), {
    theme: "swavytheme",
    fontSize: 16,
    minimap: { enabled: false },
    model
  });
  validator(model)
  model.onDidChangeContent(() => {
    validator(model);
  });
});

document.getElementById("play").addEventListener("click", async () => {
  if (!isPlayable) {
    const marker = monaco.editor.getModelMarkers()[0]
    editor.setPosition({
      lineNumber: marker.startLineNumber,
      column: marker.startColumn
    })
    return;
  }
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