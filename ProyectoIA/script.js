// Genera la URL absoluta HTTP para evitar errores de esquema en fetch
const URL_BASE = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);

let port;
let writer;

async function conectarArduino() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    writer = port.writable.getWriter();
    alert("Arduino conectado exitosamente.");
    document.getElementById("btnInicio").disabled = false;
  } catch (err) {
    console.error("Error al conectar con Arduino:", err);
  }
}

async function enviarComando(comando) {
  if (writer) {
    const data = new TextEncoder().encode(comando);
    await writer.write(data);
  }
}

function createModel() {
  const checkpointURL = URL_BASE + "model.json";
  const metadataURL = URL_BASE + "metadata.json";

  const recognizer = speechCommands.create(
    "BROWSER_FFT",
    undefined,
    checkpointURL,
    metadataURL
  );

  return recognizer;
}

async function iniciarDeteccion() {
  try {
    const recognizer = createModel();
    await recognizer.ensureModelLoaded();

    const words = recognizer.wordLabels(); // ["Arrolladora", "Ruido de fondo"]
    const labelContainer = document.getElementById("label-container");

    recognizer.listen(result => {
      const scores = result.scores;
      let maxScore = -1;
      let indexMax = -1;

      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > maxScore) {
          maxScore = scores[i];
          indexMax = i;
        }
      }

      const claseDetectada = words[indexMax];
      labelContainer.innerHTML = `Detectado: <b>${claseDetectada}</b> (${(maxScore * 100).toFixed(1)}%)`;

      if (claseDetectada === "Arrolladora" && maxScore > 0.85) {
        enviarComando('1'); // Abre el servo
      } else if (claseDetectada === "Ruido de fondo") {
        enviarComando('0'); // Cierra el servo
      }
    }, {
      includeScore: true,
      probabilityThreshold: 0.75,
      invokeCallbackOnNoiseAndUnknown: true,
      overlapFactor: 0.50
    });
  } catch (error) {
    console.error("Error al iniciar la detección o cargar el modelo:", error);
  }
}