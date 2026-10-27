
import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, AlertCircle } from 'lucide-react';
import Modal from './Modal';

// Mensagens específicas para problemas de acesso à câmera.
const mensagemDeErro = (err) => {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'O acesso à câmera foi negado. Abra as permissões deste site no navegador, permita o uso da câmera e tente novamente.';

    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Nenhuma câmera foi encontrada neste dispositivo. Você pode escolher uma foto da galeria.';

    case 'OverconstrainedError':
      return 'A câmera solicitada não está disponível. Tente novamente ou escolha uma foto da galeria.';

    case 'NotReadableError':
    case 'TrackStartError':
      return 'Não foi possível iniciar a câmera. Verifique se ela está sendo usada por outro aplicativo.';

    case 'AbortError':
      return 'A inicialização da câmera foi interrompida. Tente novamente.';

    case 'NotSupportedError':
      return 'Este navegador não oferece suporte à reprodução da câmera. Tente abrir o site no Chrome ou Safari.';

    default:
      return 'Não foi possível abrir a câmera. Verifique as permissões do navegador ou escolha uma foto da galeria.';
  }
};

function PreviaCamera({ onCapturar, onFechar }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);
  const [capturando, setCapturando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    // Captura o elemento uma única vez para utilizá-lo
    // também na função de limpeza do useEffect.
    const videoElement = videoRef.current;

    const pararStream = (stream) => {
      if (!stream) return;

      stream.getTracks().forEach((track) => {
        track.stop();
      });
    };

    async function iniciarCamera() {
      setErro('');
      setPronto(false);

      // A API de câmera exige um contexto seguro.
      if (!window.isSecureContext) {
        setErro(
          'A câmera precisa de uma conexão segura (HTTPS). Abra o site pelo endereço HTTPS publicado.'
        );
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setErro(
          'Este navegador não oferece acesso direto à câmera. Abra o site no Chrome ou Safari, ou escolha uma foto da galeria.'
        );
        return;
      }

      let stream = null;

      try {
        // Primeiro tenta utilizar a câmera traseira.
        // Caso não esteja disponível, tenta outra câmera.
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: {
                ideal: 'environment',
              },
            },
          });
        } catch (primeiroErro) {
          if (
            primeiroErro?.name === 'NotFoundError' ||
            primeiroErro?.name === 'OverconstrainedError'
          ) {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
          } else {
            throw primeiroErro;
          }
        }

        // Se o modal foi fechado enquanto a câmera
        // estava sendo inicializada, encerra o stream.
        if (cancelado) {
          pararStream(stream);
          return;
        }

        streamRef.current = stream;

        if (!videoElement) {
          pararStream(stream);
          streamRef.current = null;
          return;
        }

        // Associa a câmera ao elemento de vídeo.
        videoElement.srcObject = stream;
        videoElement.muted = true;
        videoElement.playsInline = true;

        // Reproduz explicitamente para melhorar
        // a compatibilidade com navegadores móveis.
        await videoElement.play();

        if (cancelado) {
          videoElement.pause();
          videoElement.srcObject = null;

          pararStream(stream);

          if (streamRef.current === stream) {
            streamRef.current = null;
          }

          return;
        }

        if (
          videoElement.videoWidth > 0 &&
          videoElement.videoHeight > 0
        ) {
          setPronto(true);
        }
      } catch (err) {
        console.error('Erro ao iniciar a câmera:', err);

        pararStream(stream);

        if (streamRef.current === stream) {
          streamRef.current = null;
        }

        if (!cancelado) {
          setPronto(false);
          setErro(mensagemDeErro(err));
        }
      }
    }

    iniciarCamera();

    // Libera o hardware da câmera ao fechar o modal.
    return () => {
      cancelado = true;

      if (videoElement) {
        videoElement.pause();
        videoElement.srcObject = null;
      }

      const stream = streamRef.current;

      pararStream(stream);
      streamRef.current = null;
    };
  }, []);

  // Captura um quadro do vídeo e transforma em JPEG.
  const capturar = () => {
    const video = videoRef.current;

    if (
      !video ||
      !pronto ||
      capturando ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return;
    }

    setCapturando(true);

    const canvas = document.createElement('canvas');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const contexto = canvas.getContext('2d');

    if (!contexto) {
      setErro(
        'Não foi possível processar a foto. Tente novamente.'
      );
      setCapturando(false);
      return;
    }

    try {
      contexto.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );
    } catch (err) {
      console.error('Erro ao capturar imagem:', err);

      setErro(
        'Não foi possível capturar a imagem da câmera.'
      );

      setCapturando(false);
      return;
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErro(
            'Não foi possível gerar a foto. Tente novamente.'
          );

          setCapturando(false);
          return;
        }

        const arquivo = new File(
          [blob],
          `foto-${Date.now()}.jpg`,
          {
            type: 'image/jpeg',
          }
        );

        setCapturando(false);

        // Envia o arquivo para o RegistrarItem.jsx.
        onCapturar(arquivo);
      },
      'image/jpeg',
      0.85
    );
  };

  return (
    <div className="space-y-4">
      {erro ? (
        <div
          role="alert"
          className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-2"
        >
          <AlertCircle
            size={18}
            className="shrink-0 mt-0.5 text-rose-600"
            aria-hidden="true"
          />

          <span>{erro}</span>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4] sm:aspect-video">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onLoadedMetadata={() => {
              const video = videoRef.current;

              if (
                video?.videoWidth > 0 &&
                video?.videoHeight > 0
              ) {
                setPronto(true);
              }
            }}
            onPlaying={() => {
              const video = videoRef.current;

              if (
                video?.videoWidth > 0 &&
                video?.videoHeight > 0
              ) {
                setPronto(true);
              }
            }}
            className="w-full h-full object-cover"
          />

          {!pronto && (
            <div
              role="status"
              className="absolute inset-0 flex items-center justify-center text-white gap-2 text-sm bg-black/60"
            >
              <Loader2
                size={20}
                className="animate-spin"
                aria-hidden="true"
              />

              <span>Abrindo a câmera...</span>
            </div>
          )}
        </div>
      )}

      {/* Botões de controle */}
      <div className="flex gap-2 text-sm font-semibold pt-1">
        <button
          type="button"
          onClick={onFechar}
          className="admin-modal-back-button flex-1 min-h-12 px-3 py-2.5 border rounded-xl transition-colors cursor-pointer"
        >
          Cancelar
        </button>

        {!erro && (
          <button
            type="button"
            onClick={capturar}
            disabled={!pronto || capturando}
            className="flex-1 min-h-12 px-3 py-2.5 bg-indigo-900 rounded-xl text-white hover:bg-indigo-800 flex justify-center items-center gap-2 shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {capturando ? (
              <Loader2
                size={18}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Camera size={18} aria-hidden="true" />
            )}

            <span>
              {capturando
                ? 'Capturando...'
                : 'Capturar foto'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// Captura de foto no celular ou computador.
export default function CapturaFoto({
  aberto,
  onFechar,
  onCapturar,
}) {
  // Evita manter a câmera ativa com o modal fechado.
  if (!aberto) {
    return null;
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Tirar foto do pertence"
      larguraMax="max-w-lg"
    >
      <PreviaCamera
        onCapturar={onCapturar}
        onFechar={onFechar}
      />
    </Modal>
  );
}
