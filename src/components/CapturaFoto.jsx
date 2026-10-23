import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, AlertCircle } from 'lucide-react';
import Modal from './Modal';

// Mensagens em linguagem simples para cada tipo de falha da câmera (Nielsen 9)
const mensagemDeErro = (err) => {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'A câmera está bloqueada. Clique no ícone de cadeado ao lado do endereço do site, libere a câmera e tente de novo.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Nenhuma câmera foi encontrada neste dispositivo. Use "Escolher da galeria".';
    case 'NotReadableError':
      return 'A câmera está sendo usada por outro programa (Meet, Teams, Zoom...). Feche-o e tente de novo.';
    default:
      return 'Não foi possível abrir a câmera. Use "Escolher da galeria".';
  }
};

function PreviaCamera({ onCapturar, onFechar }) {
  const videoRef = useRef(null);
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let stream = null;

    async function iniciar() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErro('Este navegador não permite usar a câmera aqui. Use "Escolher da galeria".');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error('Erro ao abrir a câmera:', err);
        if (!cancelado) setErro(mensagemDeErro(err));
      }
    }

    iniciar();

    // Desliga a câmera (e a luz de "em uso") ao fechar a janela
    return () => {
      cancelado = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capturar = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapturar(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <>
      {erro ? (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-2" role="alert">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
          <span>{erro}</span>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setPronto(true)}
            className="w-full h-full object-cover"
          />
          {!pronto && (
            <div className="absolute inset-0 flex items-center justify-center text-white gap-2 text-sm" role="status">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Abrindo a câmera...
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 text-sm font-semibold pt-1">
        <button
          type="button"
          onClick={onFechar}
          className="flex-1 min-h-12 py-2.5 border border-gray-300 rounded-xl text-gray-800 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        {!erro && (
          <button
            type="button"
            onClick={capturar}
            disabled={!pronto}
            className="flex-1 min-h-12 py-2.5 bg-indigo-900 rounded-xl text-white hover:bg-indigo-800 flex justify-center items-center gap-2 shadow-xs transition disabled:opacity-50"
          >
            <Camera size={18} aria-hidden="true" /> Capturar foto
          </button>
        )}
      </div>
    </>
  );
}

// Janela de câmera para computadores. No celular usamos o próprio app de câmera (atributo "capture").
export default function CapturaFoto({ aberto, onFechar, onCapturar }) {
  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Tirar foto do pertence" larguraMax="max-w-lg">
      <PreviaCamera onCapturar={onCapturar} onFechar={onFechar} />
    </Modal>
  );
}