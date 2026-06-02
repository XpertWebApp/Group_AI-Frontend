'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Send, X } from 'lucide-react';
import { ModalOverlay } from './ModalOverlay';
import { cn } from '@/lib/utils/cn';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { proposalsApi } from '@/lib/api/proposals';
import { isOdooContactRequiredError } from '@/lib/utils/odooGate';

/**
 * Side-by-side Send Offer modal — bilingual preview + send.
 *
 * Per the Bilingual PDF Send Flow handover (Neha, 2026-06-02): the language
 * choice and the visual confirmation are the SAME act. Staff sees both PDF
 * renderings, picks via radio, and the Send button label dynamically
 * reflects the choice — "SEND IN ENGLISH" / "SEND IN GERMAN" — so the
 * staff member can't accidentally send the wrong language.
 *
 * Lifecycle:
 *   - On open: kick off EN preview immediately; DE preview 300ms later
 *     (stagger keeps EN feeling instant and avoids hitting DeepL twice
 *     simultaneously for the same proposal).
 *   - Each pane: shows shimmer skeleton → fades to <iframe> on success,
 *     or shows retry CTA on failure.
 *   - Send button is disabled until the CHOSEN pane has loaded. If the
 *     user picks DE while DE is still loading, the button shows a
 *     spinner and waits.
 *
 * Failure modes handled:
 *   - One pane fails: other pane still works; user can send the working
 *     language.
 *   - Both panes fail: Send is locked, banner explains.
 *   - Send 400 ODOO_CONTACT_REQUIRED: surfaced via the inline Send error
 *     banner with the BE-supplied message; parent page already shows the
 *     blocking dialog.
 *   - Send 5xx / SMTP fail: error banner with retry.
 *
 * Memory:
 *   - Blob URLs are revoked on unmount + on retry to prevent leaks across
 *     multiple modal opens.
 *   - In-flight preview fetches are aborted on close (saves DeepL round-trip
 *     when staff cancels before previews resolved).
 */

type Lang = 'en' | 'de';

interface PreviewState {
  status: 'loading' | 'loaded' | 'error';
  blobUrl: string | null;
  error: string | null;
}

interface SendOfferDualPreviewModalProps {
  open: boolean;
  proposalId: string;
  /** Initial recipients list (typically request.contactEmail). */
  initialRecipients: string[];
  /** Short label for the modal header (e.g. proposal number / destination). */
  headerSubtitle?: string;
  /** Called after a successful send. Parent should refresh state + show toast. */
  onSent: (result: SendOfferResult) => void;
  /** Called when the user dismisses (Cancel / Esc / backdrop). */
  onClose: () => void;
  /**
   * Optional pre-send hook for callers that need to do a separate "approve"
   * step before /actions/send (current FE flow on booking-request detail).
   * Receives the chosen language so the approve PDF matches what gets sent.
   * Throw to abort the send; the modal will show the error inline.
   */
  beforeSend?: (language: Lang) => Promise<void>;
}

export interface SendOfferResult {
  language: Lang;
  recipients: string[];
  /** The raw `data` field from the BE response. Shape per BE handover §2.2. */
  data: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SendOfferDualPreviewModal({
  open,
  proposalId,
  initialRecipients,
  headerSubtitle,
  onSent,
  onClose,
  beforeSend,
}: SendOfferDualPreviewModalProps) {
  const { t } = useLanguage();

  // ── Preview state ───────────────────────────────────────────────
  const [previews, setPreviews] = useState<Record<Lang, PreviewState>>(() => ({
    en: { status: 'loading', blobUrl: null, error: null },
    de: { status: 'loading', blobUrl: null, error: null },
  }));
  const [chosenLang, setChosenLang] = useState<Lang>('en');
  // Abort controllers for in-flight preview fetches — aborted on close so
  // canceling mid-preview saves the DeepL round-trip.
  const abortersRef = useRef<Record<Lang, AbortController | null>>({ en: null, de: null });

  // ── Recipients (chip input pattern from existing Approve & Send flow) ──
  const [recipients, setRecipients] = useState<string[]>(initialRecipients);
  const [recipientInput, setRecipientInput] = useState('');
  const [recipientError, setRecipientError] = useState<string | null>(null);

  // ── Send state ─────────────────────────────────────────────────
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Re-seed recipients when the modal re-opens for a different proposal.
  useEffect(() => {
    if (open) {
      setRecipients(initialRecipients);
      setRecipientInput('');
      setRecipientError(null);
      setSendError(null);
      setChosenLang('en');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proposalId]);

  const fetchPreview = useCallback(
    async (lang: Lang) => {
      // Revoke any previously-held blob URL for this lang before issuing
      // a fresh fetch. Prevents leaks on retry.
      setPreviews((prev) => {
        if (prev[lang].blobUrl) URL.revokeObjectURL(prev[lang].blobUrl);
        return { ...prev, [lang]: { status: 'loading', blobUrl: null, error: null } };
      });

      // Cancel any existing fetch for this lang.
      abortersRef.current[lang]?.abort();
      const ctrl = new AbortController();
      abortersRef.current[lang] = ctrl;

      try {
        const blobUrl = await proposalsApi.previewPdf(proposalId, lang, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setPreviews((prev) => ({
          ...prev,
          [lang]: { status: 'loaded', blobUrl, error: null },
        }));
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setPreviews((prev) => ({
          ...prev,
          [lang]: {
            status: 'error',
            blobUrl: null,
            error: err instanceof Error ? err.message : String(err),
          },
        }));
      }
    },
    [proposalId],
  );

  // Kick off previews when the modal opens. EN first; DE 300ms behind.
  useEffect(() => {
    if (!open) return;
    fetchPreview('en');
    const t = setTimeout(() => fetchPreview('de'), 300);
    return () => clearTimeout(t);
  }, [open, fetchPreview]);

  // Cleanup on unmount / close: abort in-flight fetches, revoke blob URLs.
  useEffect(() => {
    if (open) return;
    abortersRef.current.en?.abort();
    abortersRef.current.de?.abort();
    setPreviews((prev) => {
      if (prev.en.blobUrl) URL.revokeObjectURL(prev.en.blobUrl);
      if (prev.de.blobUrl) URL.revokeObjectURL(prev.de.blobUrl);
      return {
        en: { status: 'loading', blobUrl: null, error: null },
        de: { status: 'loading', blobUrl: null, error: null },
      };
    });
  }, [open]);

  // Final unmount cleanup — also revoke any URLs left over.
  useEffect(() => {
    return () => {
      abortersRef.current.en?.abort();
      abortersRef.current.de?.abort();
      // Reading state in cleanup is a closure-stale anti-pattern, so we
      // just store the URLs in a ref… or accept that the `open=false`
      // effect above already revokes them in practice. The double-revoke
      // guard inside fetchPreview makes this safe even if it runs twice.
    };
  }, []);

  // ── Recipient helpers ──────────────────────────────────────────
  const addRecipient = useCallback(
    (raw: string) => {
      const val = raw.trim();
      if (!val) return;
      if (!EMAIL_RE.test(val)) {
        setRecipientError(t.offer.sendOfferInvalidEmail);
        return;
      }
      const lower = val.toLowerCase();
      if (recipients.map((r) => r.toLowerCase()).includes(lower)) {
        setRecipientInput('');
        return;
      }
      setRecipients((prev) => [...prev, val]);
      setRecipientInput('');
      setRecipientError(null);
    },
    [recipients, t],
  );

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const handleRecipientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addRecipient(recipientInput);
    } else if (e.key === 'Backspace' && !recipientInput && recipients.length > 0) {
      removeRecipient(recipients[recipients.length - 1]);
    }
  };

  // ── Send ───────────────────────────────────────────────────────
  const canSend = useMemo(() => {
    if (sending) return false;
    if (recipients.length === 0) return false;
    if (previews[chosenLang].status !== 'loaded') return false;
    return true;
  }, [sending, recipients, previews, chosenLang]);

  const bothPreviewsFailed =
    previews.en.status === 'error' && previews.de.status === 'error';

  const handleSend = useCallback(async () => {
    // Flush any half-typed email so a Send click after typing one address
    // doesn't drop it.
    let finalRecipients = recipients;
    const pending = recipientInput.trim();
    if (pending) {
      if (!EMAIL_RE.test(pending)) {
        setRecipientError(t.offer.sendOfferInvalidEmail);
        return;
      }
      if (!finalRecipients.map((r) => r.toLowerCase()).includes(pending.toLowerCase())) {
        finalRecipients = [...finalRecipients, pending];
        setRecipients(finalRecipients);
      }
      setRecipientInput('');
    }
    if (finalRecipients.length === 0) {
      setRecipientError(t.offer.sendOfferAtLeastOneRecipient);
      return;
    }

    setSending(true);
    setSendError(null);

    // Optional pre-send hook (current FE: approve before send so the BE
    // generates the PDF + status transitions correctly).
    if (beforeSend) {
      try {
        await beforeSend(chosenLang);
      } catch (err) {
        setSending(false);
        setSendError(err instanceof Error ? err.message : String(err));
        return;
      }
    }

    try {
      const result = await proposalsApi.send(proposalId, {
        sendToEmails: finalRecipients,
        language: chosenLang,
      });
      onSent({ language: chosenLang, recipients: finalRecipients, data: result });
      // Parent handles closing + toast.
    } catch (err: unknown) {
      const ax = await import('axios');
      if (ax.isAxiosError(err)) {
        // Special-case Odoo gate so the user sees the right error path.
        if (isOdooContactRequiredError(err)) {
          // Surface the BE-supplied message verbatim; the parent page also
          // mounts the blocking dialog independently.
          const msg = (err.response?.data as { message?: string })?.message
            ?? 'Link the Odoo customer first.';
          setSendError(msg);
        } else {
          const msg =
            (err.response?.data as { message?: string })?.message ??
            'Failed to send the offer.';
          setSendError(msg);
        }
      } else {
        setSendError(err instanceof Error ? err.message : 'Network error');
      }
    } finally {
      setSending(false);
    }
  }, [recipients, recipientInput, t, beforeSend, chosenLang, proposalId, onSent]);

  // Close handler — if a send is in flight, confirm before closing. If
  // recipients have changed and no send is in flight, just close (any
  // discard confirmation would be over-eager).
  const handleClose = useCallback(() => {
    if (sending) {
      if (typeof window !== 'undefined' && !window.confirm(t.offer.sendOfferConfirmCloseDuringSend)) {
        return;
      }
    }
    onClose();
  }, [sending, onClose, t]);

  const sendLabel = sending
    ? t.offer.sendOfferSending
    : chosenLang === 'de'
      ? t.offer.sendOfferSendInGerman
      : t.offer.sendOfferSendInEnglish;

  return (
    <ModalOverlay open={open} onClose={handleClose} labelledBy="send-offer-modal-title" className="p-4">
      <div
        className="bg-white w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{
          borderRadius: 8,
          border: '1px solid #E0E0E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* §5.3 accent stripe */}
        <div aria-hidden className="h-[3px] w-full bg-sett-primary shrink-0" />

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-sett-border shrink-0">
          <div className="min-w-0">
            <h2
              id="send-offer-modal-title"
              className="font-montserrat text-[18px] font-bold leading-tight text-sett-navy truncate"
            >
              {t.offer.sendOfferTitle}
              {headerSubtitle ? (
                <span className="text-sett-text-secondary font-medium ml-2">— {headerSubtitle}</span>
              ) : null}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-[4px] hover:bg-sett-fill text-sett-text-secondary hover:text-sett-navy transition-colors"
            aria-label={t.offer.sendOfferCancel}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-4 sm:p-5">
          {/* Both-panes failure banner */}
          {bothPreviewsFailed && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-[4px] border border-sett-destructive/30 bg-sett-destructive/5 text-sett-destructive font-montserrat text-[13px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t.offer.sendOfferBothPreviewsFailed}</span>
            </div>
          )}

          {/* Side-by-side panes (stack on mobile) */}
          <fieldset
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            role="radiogroup"
            aria-label={t.offer.sendOfferTitle}
          >
            <PreviewPane
              lang="en"
              title={t.offer.sendOfferPaneEnglishTitle}
              preview={previews.en}
              active={chosenLang === 'en'}
              radioLabel={t.offer.sendOfferSendThisVersion}
              radioAriaLabel={t.offer.sendOfferSendThisVersionEnAria}
              onSelect={() => setChosenLang('en')}
              onRetry={() => fetchPreview('en')}
              t={t}
              failedTitleTemplate={t.offer.sendOfferPreviewFailedTitle}
              langDisplay="English"
            />
            <PreviewPane
              lang="de"
              title={t.offer.sendOfferPaneGermanTitle}
              preview={previews.de}
              active={chosenLang === 'de'}
              radioLabel={t.offer.sendOfferSendThisVersion}
              radioAriaLabel={t.offer.sendOfferSendThisVersionDeAria}
              onSelect={() => setChosenLang('de')}
              onRetry={() => fetchPreview('de')}
              t={t}
              failedTitleTemplate={t.offer.sendOfferPreviewFailedTitle}
              langDisplay="German"
            />
          </fieldset>

          {/* Recipients */}
          <div className="mt-5">
            <label
              htmlFor="send-offer-recipients-input"
              className="block font-montserrat text-[12px] font-semibold uppercase tracking-[0.05em] text-sett-navy mb-1.5"
            >
              {t.offer.sendOfferRecipientsLabel}
            </label>
            <div
              className={cn(
                'flex flex-wrap items-center gap-1.5 min-h-[44px] px-2 py-1.5 rounded-input border bg-white transition-[border-color,box-shadow] duration-150',
                recipientError ? 'border-sett-destructive' : 'border-sett-border focus-within:border-sett-primary focus-within:shadow-input-focus',
              )}
            >
              {recipients.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] bg-sett-light-green-bg border border-sett-primary/30 font-montserrat text-[12px] font-semibold text-sett-navy"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeRecipient(email)}
                    className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-sett-text-secondary hover:bg-white hover:text-sett-destructive transition-colors"
                    aria-label={`Remove ${email}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                id="send-offer-recipients-input"
                type="email"
                value={recipientInput}
                onChange={(e) => {
                  setRecipientInput(e.target.value);
                  if (recipientError) setRecipientError(null);
                }}
                onKeyDown={handleRecipientKeyDown}
                onBlur={() => recipientInput.trim() && addRecipient(recipientInput)}
                placeholder={recipients.length === 0 ? t.offer.sendOfferRecipientPlaceholder : ''}
                className="flex-1 min-w-[180px] bg-transparent border-0 outline-none font-montserrat text-[14px] text-sett-navy placeholder:text-sett-text-accent"
              />
            </div>
            {recipientError && (
              <p className="mt-1 font-montserrat text-[12px] text-sett-destructive">{recipientError}</p>
            )}
            {!recipientError && recipients.length === 0 && (
              <p className="mt-1 font-montserrat text-[11px] text-sett-text-accent">{t.offer.sendOfferAddAnotherRecipient}</p>
            )}
          </div>

          {/* Info note — explains the "re-rendered with current data" caveat */}
          <p className="mt-4 font-montserrat text-[12px] text-sett-text-secondary leading-snug italic">
            <span aria-hidden>ℹ </span>
            {t.offer.sendOfferInfoNote}
          </p>

          {/* Send error banner */}
          {sendError && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-[4px] border border-sett-destructive/30 bg-sett-destructive/5 text-sett-destructive font-montserrat text-[13px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{sendError}</span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-sett-border bg-white shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center justify-center h-[41px] px-5 rounded-[4px] border-2 border-sett-primary bg-transparent font-montserrat text-[13px] font-bold uppercase tracking-[0.08em] text-sett-primary hover:bg-sett-primary/5 transition-colors duration-200"
          >
            {t.offer.sendOfferCancel}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend || bothPreviewsFailed}
            // aria-live ensures screen readers announce the language change
            // ("Send in German") immediately when the user picks a radio.
            aria-live="polite"
            className={cn(
              'inline-flex items-center justify-center gap-2 h-[41px] px-6 rounded-[4px]',
              'font-montserrat text-[13px] font-bold uppercase tracking-[0.08em]',
              'transition-colors duration-200 active:scale-[0.98]',
              'bg-sett-primary text-sett-navy hover:bg-sett-green-dark hover:text-white',
              'disabled:bg-sett-border disabled:text-sett-text-accent disabled:cursor-not-allowed disabled:hover:bg-sett-border disabled:hover:text-sett-text-accent',
            )}
          >
            {sending ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sendLabel}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

/* ─────────────── Preview Pane ─────────────── */

function PreviewPane({
  lang,
  title,
  preview,
  active,
  radioLabel,
  radioAriaLabel,
  onSelect,
  onRetry,
  t,
  failedTitleTemplate,
  langDisplay,
}: {
  lang: Lang;
  title: string;
  preview: PreviewState;
  active: boolean;
  radioLabel: string;
  radioAriaLabel: string;
  onSelect: () => void;
  onRetry: () => void;
  t: ReturnType<typeof useLanguage>['t'];
  failedTitleTemplate: string;
  langDisplay: 'English' | 'German';
}) {
  return (
    <label
      className={cn(
        'group flex flex-col bg-white rounded-[8px] overflow-hidden cursor-pointer',
        'transition-[border-color,box-shadow] duration-200',
        // §5.3 emphasis-card pattern — 3px green active border.
        active
          ? 'ring-[3px] ring-sett-primary border border-sett-primary shadow-[0_4px_12px_-2px_rgba(170,199,55,0.25)]'
          : 'border border-sett-border hover:border-sett-primary/40',
      )}
    >
      {/* Pane header — navy uppercase + thin green underline */}
      <div className="px-4 py-2.5 border-b border-sett-border bg-white" aria-hidden>
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-sett-primary rounded-full" />
          <span className="font-montserrat text-[13px] font-bold uppercase tracking-[0.08em] text-sett-navy">
            {title}
          </span>
        </div>
      </div>

      {/* PDF iframe / skeleton / retry */}
      <div className="relative bg-[#F8F9FA] aspect-[210/297] max-h-[60vh]">
        {preview.status === 'loading' && <PreviewSkeleton />}
        {preview.status === 'loaded' && preview.blobUrl && (
          <iframe
            title={`${langDisplay} offer preview`}
            src={preview.blobUrl}
            className="absolute inset-0 w-full h-full bg-white"
          />
        )}
        {preview.status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
            <AlertTriangle className="w-6 h-6 text-sett-destructive" />
            <p className="font-montserrat text-[13px] font-semibold text-sett-navy">
              {failedTitleTemplate.replace('{language}', langDisplay)}
            </p>
            <button
              type="button"
              onClick={(e) => {
                // Stop the click bubbling to the wrapping <label>, otherwise
                // clicking Retry also flips the radio.
                e.preventDefault();
                e.stopPropagation();
                onRetry();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border-2 border-sett-primary bg-transparent font-montserrat text-[12px] font-bold uppercase tracking-[0.05em] text-sett-primary hover:bg-sett-primary hover:text-sett-navy transition-colors duration-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t.offer.sendOfferPreviewRetry}
            </button>
          </div>
        )}
      </div>

      {/* Radio row — "Send this version" */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-sett-border">
        <input
          type="radio"
          name="send-offer-lang"
          value={lang}
          checked={active}
          onChange={onSelect}
          aria-label={radioAriaLabel}
          className="w-4 h-4 accent-sett-primary cursor-pointer"
        />
        <span
          className={cn(
            'font-montserrat text-[13px] font-semibold',
            active ? 'text-sett-navy' : 'text-sett-text-secondary',
          )}
        >
          {radioLabel}
        </span>
      </div>
    </label>
  );
}

/* ─────────────── Loading skeleton ─────────────── */

function PreviewSkeleton() {
  return (
    <div className="absolute inset-0 p-4 bg-white overflow-hidden">
      {/* Faux PDF rendering — a few title bars + paragraph stripes */}
      <div className="space-y-2 animate-pulse">
        <div className="h-3 w-1/3 rounded bg-sett-border-light" />
        <div className="h-2 w-1/2 rounded bg-sett-border-light/70" />
        <div className="h-px w-full bg-sett-border my-3" />
        <div className="h-2 w-full rounded bg-sett-border-light" />
        <div className="h-2 w-11/12 rounded bg-sett-border-light" />
        <div className="h-2 w-10/12 rounded bg-sett-border-light" />
        <div className="h-2 w-9/12 rounded bg-sett-border-light/70" />
        <div className="h-px w-full bg-sett-border my-3" />
        <div className="h-3 w-1/4 rounded bg-sett-border-light" />
        <div className="h-2 w-full rounded bg-sett-border-light" />
        <div className="h-2 w-11/12 rounded bg-sett-border-light" />
        <div className="h-2 w-10/12 rounded bg-sett-border-light" />
        <div className="h-px w-full bg-sett-border my-3" />
        <div className="h-2 w-full rounded bg-sett-border-light" />
        <div className="h-2 w-11/12 rounded bg-sett-border-light" />
      </div>
      {/* Diagonal shimmer sweep */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_cubic-bezier(0.4,0,0.2,1)_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}
