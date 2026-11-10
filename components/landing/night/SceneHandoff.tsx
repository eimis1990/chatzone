import { CheckIcon } from 'lucide-react'
import { Scene, at } from './Scene'
import s from './night.module.css'

/**
 * 05:20 — a question the store never wrote an answer for. Loqara says so,
 * takes the shopper's contact, and leaves the conversation for a person.
 */
export function SceneHandoff() {
  return (
    <Scene
      minutes={320}
      when="05:20"
      sky="linear-gradient(180deg, #2a2058 0%, #37265f 45%, #4d2f66 100%)"
      stars={0.26}
      title={<>Jonas asks something the store never wrote down.</>}
      body={
        <>
          When the answer isn&rsquo;t in your content, Loqara says so instead of inventing one. It
          takes the shopper&rsquo;s contact details and leaves the whole conversation in your inbox,
          marked for a person.
        </>
      }
    >
      <div className={s.talk}>
        <p className={`${s.step} ${s.bubble} ${s.fromCustomer}`} style={at(3, 11)}>
          Can you make the Oslo sofa 172 cm wide?
        </p>
        <p className={`${s.step} ${s.bubble} ${s.fromAgent}`} style={at(16, 25)}>
          I can&rsquo;t find anything about custom sizes, so I won&rsquo;t guess. I can pass this to
          the team for the morning. Where should they reply?
        </p>
        <div className={`${s.step} ${s.lead}`} style={at(31, 40)}>
          <p className={s.leadTitle}>Leave your details</p>
          <p className={s.leadField}>
            Name
            <span className={s.leadBox}>
              <span className={s.scrollTyped} style={at(40, 46)}>
                Jonas
              </span>
            </span>
          </p>
          <p className={s.leadField}>
            Email
            <span className={s.leadBox}>
              <span className={s.scrollTyped} style={at(47, 58)}>
                jonas@pastas.lt
              </span>
            </span>
          </p>
          <p className={s.leadSend}>Send to the team</p>
        </div>
        <p className={`${s.step} ${s.verify}`} style={at(64, 72)}>
          <span className={s.tick}>
            <CheckIcon className="size-3.5" strokeWidth={3} aria-hidden="true" />
          </span>
          Passed to the team with the full conversation
        </p>
        <p className={`${s.step} ${s.tray}`} style={at(79, 88)}>
          <b>Needs a person</b>
          <span>Jonas: custom width for the Oslo sofa</span>
          <time>05:20</time>
        </p>
      </div>
    </Scene>
  )
}
