import { Helmet } from 'react-helmet'
import { useSearchParams } from 'react-router-dom'
import { SUPPORT_EMAIL, founder } from '../constants/site'

const ContactPage = () => {
  const [searchParams] = useSearchParams()
  const intent = searchParams.get('intent')
  const defaultSubject =
    intent === 'upgrade'
      ? 'Upgrade - Recruiter'
      : intent === 'recruiter-plan'
        ? 'Employer subscription / pricing'
        : ''
  return (
    <>
      <Helmet>
        <title>Contact Kraftisium - Get In Touch</title>
        <meta name="description" content="Contact Kraftisium for support, partnerships, or questions about our AI-powered resume matching platform." />
        <meta name="keywords" content="contact, support, help, customer service, partnerships" />
        <meta property="og:title" content="Contact Kraftisium - Get In Touch" />
        <meta property="og:description" content="Contact Kraftisium for support, partnerships, or questions about our AI-powered resume matching platform." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="container mx-auto px-4 py-16 text-white bg-[#2b2b2b]">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-[#fcc636]">Contact Us</h1>

          <div className="card bg-[#1a1a1a] shadow-brand border border-white/10">
            <div className="card-body p-8">
              <form className="space-y-6">
                <div className="form-control">
                  <label className="label py-2">
                    <span className="label-text text-white/80">Name</span>
                  </label>
                  <input type="text" placeholder="Your name" className="k-input" />
                </div>

                <div className="form-control">
                  <label className="label py-2">
                    <span className="label-text text-white/80">Email</span>
                  </label>
                  <input type="email" placeholder="your@email.com" className="k-input" />
                </div>

                <div className="form-control">
                  <label className="label py-2">
                    <span className="label-text text-white/80">Subject</span>
                  </label>
                  <input type="text" placeholder="How can we help?" defaultValue={defaultSubject} className="k-input" />
                </div>

                <div className="form-control">
                  <label className="label py-2">
                    <span className="label-text text-white/80">Message</span>
                  </label>
                  <textarea
                    className="k-input h-32"
                    placeholder="Tell us more about your inquiry..."
                  ></textarea>
                </div>

                <div className="form-control mt-8">
                  <button className="k-btn w-full">Send Message</button>
                </div>
              </form>
            </div>
          </div>

          <div className="mt-12 text-center">
            <h3 className="text-2xl font-bold mb-6 text-[#fcc636]">Other ways to reach us</h3>
            <div className="space-y-4 text-white/70">
              <p>
                <strong className="text-white">Email:</strong>{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#fcc636] hover:underline">
                  {SUPPORT_EMAIL}
                </a>
              </p>
              <p>
                <strong className="text-white">Founder:</strong>{' '}
                <a
                  href={founder.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#fcc636] hover:underline">
                  {founder.name} (@{founder.handle})
                </a>
              </p>
              <p>
                <strong className="text-white">Platform:</strong>{' '}
                <a href="https://kraftisium.xyz" className="text-[#fcc636] hover:underline">
                  kraftisium.xyz
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ContactPage