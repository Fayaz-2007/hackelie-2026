const COPY = {
  alert: {
    title: 'Running low — book a refill soon',
    text: 'Gets you to your provider’s booking page with your number ready to paste.',
  },
  danger: {
    title: 'Cylinder critical — book a refill now',
    text: 'Gets you to your provider’s booking page with your number ready to paste.',
  },
}

export default function BookingBanner({ urgency = 'alert', providerName, note, onBook }) {
  const copy = COPY[urgency] ?? COPY.alert

  return (
    <div className={`booking-banner booking-banner--${urgency}`} role="alert">
      <div className="booking-banner__body">
        <span className="booking-banner__icon" aria-hidden="true">
          {urgency === 'danger' ? '⚠️' : '⛽'}
        </span>
        <div>
          <p className="booking-banner__title">{copy.title}</p>
          <p className="booking-banner__text">
            {providerName ? `Opens ${providerName} in a new tab. ` : 'Opens your provider’s page in a new tab. '}
            {copy.text}
          </p>
          {note && (
            <p className="booking-banner__note">
              Log in with OTP on the page that just opened, then paste your number and complete the booking there.
            </p>
          )}
        </div>
      </div>
      <button type="button" className="booking-banner__btn" onClick={onBook}>
        Book Cylinder Now
      </button>
    </div>
  )
}
