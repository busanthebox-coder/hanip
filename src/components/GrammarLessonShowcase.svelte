<script>
  import { onDestroy, onMount } from 'svelte';
  import AudioDot from './cards/AudioDot.svelte';

  const LAST_STEP = 13;
  let step = 0;
  let answer = '';
  let previousTheme;

  onMount(() => {
    previousTheme = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = 'dark';
  });

  onDestroy(() => {
    if (previousTheme) document.documentElement.dataset.theme = previousTheme;
    else delete document.documentElement.dataset.theme;
  });

  $: canContinue = step !== 12 || answer !== '';

  function next() {
    if (!canContinue) return;
    if (step < LAST_STEP) {
      step += 1;
      answer = '';
      window.scrollTo(0, 0);
    } else {
      step = 0;
      answer = '';
    }
  }

  function back() {
    if (step > 0) {
      step -= 1;
      answer = '';
      window.scrollTo(0, 0);
    }
  }
</script>

<svelte:head><title>Hanip grammar bite preview</title></svelte:head>

<main class="lesson" data-step={step + 1}>
  <header class="top">
    <button class="close" aria-label={step ? 'Go back' : 'Close'} on:click={back}>{step ? '‹' : '×'}</button>
    <div class="progress" aria-label={`Step ${step + 1} of ${LAST_STEP + 1}`}>
      {#each Array(LAST_STEP + 1) as _, index}
        <span class:done={index < step} class:now={index === step}></span>
      {/each}
    </div>
    <span class="bite-count">BITE 2/8</span>
  </header>

  <section class="stage">
    {#key step}
      <div class="screen">
        {#if step === 0}
          <div class="eyebrow">GRAMMAR BITE · 문법 한입</div>
          <h1>Ask someone—or ask permission?</h1>
          <p class="lead">One short ending changes <em>who</em> will do the action. Learn the difference before you solve anything.</p>

          <div class="hero-pair">
            <div>
              <span>ASK SOMEONE</span>
              <p>사진 찍어 <strong>주세요.</strong></p>
              <small>Please take a photo for me.</small>
            </div>
            <div>
              <span>ASK PERMISSION</span>
              <p>사진 찍어<strong>도 돼요?</strong></p>
              <small>May I take a photo?</small>
            </div>
          </div>

          <div class="outcome">
            <span>BY THE END</span>
            <p>You can read both patterns, build them from a verb, and choose the right one in daily life.</p>
          </div>

        {:else if step === 1}
          <div class="eyebrow">MEANING · 뜻</div>
          <h1>First ask: Who will act?</h1>
          <p class="lead">Do not start with the verb ending. Start with the person doing the action.</p>

          <div class="actor-list">
            <div class="actor-row">
              <div class="actor"><span>LISTENER</span><small>상대방</small></div>
              <div class="utterance">
                <div class="ko">문을 열어 <strong>주세요.</strong> <AudioDot text="문을 열어 주세요." size={26} /></div>
                <div class="rom">muneul yeoreo juseyo</div>
                <div class="en">Please open the door.</div>
              </div>
            </div>
            <div class="actor-row">
              <div class="actor me"><span>ME</span><small>나</small></div>
              <div class="utterance">
                <div class="ko">문을 열어<strong>도 돼요?</strong> <AudioDot text="문을 열어도 돼요?" size={26} /></div>
                <div class="rom">muneul yeoreodo dwaeyo?</div>
                <div class="en">May I open the door?</div>
              </div>
            </div>
          </div>

          <p class="tip"><span>MEMORY KEY</span> Listener acts = request. I act = permission.</p>

        {:else if step === 5}
          <div class="eyebrow">FORM 1 · 만드는 법</div>
          <h1>Build the 아/어 form</h1>
          <p class="lead">Both patterns begin with the same verb base. Start from the dictionary form.</p>

          <div class="formula">
            <span>STEP 1</span>
            <p>Remove <strong>다</strong></p>
            <div class="transform">먹<span>다</span> → 먹-</div>
          </div>

          <div class="rule-list">
            <div>
              <span>Last vowel is ㅏ or ㅗ</span>
              <p>Add <strong>아</strong></p>
              <small>앉다 → 앉아 · <i>sit</i></small>
            </div>
            <div>
              <span>Any other last vowel</span>
              <p>Add <strong>어</strong></p>
              <small>먹다 → 먹어 · <i>eat</i></small>
            </div>
            <div>
              <span>하다 verbs</span>
              <p>하다 → <strong>해</strong></p>
              <small>말하다 → 말해 · <i>speak</i></small>
            </div>
          </div>

          <p class="footnote">Common spelling changes come next. Less common irregular patterns are taught separately.</p>

        {:else if step === 6}
          <div class="eyebrow">FORM 2 · 모음 찾기</div>
          <h1>Find the final vowel—not the final letter</h1>
          <p class="lead">A verb stem may end with a consonant. That consonant does not choose 아 or 어. Look at the vowel inside the stem’s last syllable.</p>

          <div class="vowel-map">
            <div>
              <span class="stem">닫-</span>
              <p>Final syllable <b>닫</b> has vowel <strong>ㅏ</strong></p>
              <small>ㅏ chooses 아 → 닫아</small>
            </div>
            <div>
              <span class="stem">먹-</span>
              <p>Final syllable <b>먹</b> has vowel <strong>ㅓ</strong></p>
              <small>ㅓ chooses 어 → 먹어</small>
            </div>
            <div>
              <span class="stem">읽-</span>
              <p>Final syllable <b>읽</b> has vowel <strong>ㅣ</strong></p>
              <small>ㅣ chooses 어 → 읽어</small>
            </div>
          </div>

          <div class="notice">
            <span>KEY POINT</span>
            <p><b>받침</b> (a final consonant) may change pronunciation, but it does not decide between 아 and 어.</p>
          </div>

        {:else if step === 7}
          <div class="eyebrow">FORM 3 · 축약형</div>
          <h1>Some vowels become shorter</h1>
          <p class="lead">Korean often combines two vowels. Learn the final written form you will actually see.</p>

          <div class="change-list">
            <div><span>가 + 아</span><b>가</b><small>가다 · to go</small></div>
            <div><span>보 + 아</span><b>봐</b><small>보다 · to see</small></div>
            <div><span>주 + 어</span><b>줘</b><small>주다 · to give</small></div>
            <div><span>마시 + 어</span><b>마셔</b><small>마시다 · to drink</small></div>
            <div><span>되 + 어</span><b>돼</b><small>되다 · to become</small></div>
            <div><span>하 + 여</span><b>해</b><small>하다 · to do</small></div>
          </div>

          <div class="notice">
            <span>SPELLING TIP</span>
            <p><strong>돼</strong> is short for <b>되어</b>. Write <strong>돼요</strong>, not <s>되요</s>.</p>
          </div>

        {:else if step === 8}
          <div class="eyebrow">FORM 4 · ㅡ 탈락</div>
          <h1>When the stem ends in ㅡ</h1>
          <p class="lead">The vowel ㅡ disappears before 아/어. If there is an earlier syllable, its vowel helps choose the result.</p>

          <div class="eu-list">
            <div>
              <span>Earlier vowel is ㅏ or ㅗ</span>
              <p>바쁘다 → 바<strong>빠</strong></p>
              <small>바 has ㅏ, so ㅡ drops and 아 is used.</small>
            </div>
            <div>
              <span>Any other vowel</span>
              <p>예쁘다 → 예<strong>뻐</strong></p>
              <small>예 does not have ㅏ or ㅗ, so 어 is used.</small>
            </div>
            <div>
              <span>No earlier syllable</span>
              <p>쓰다 → <strong>써</strong></p>
              <small>With no earlier vowel, use 어.</small>
            </div>
          </div>

          <div class="notice">
            <span>IN THIS LESSON</span>
            <p><strong>써 주세요</strong> means “Please write/use it.” <strong>써도 돼요?</strong> means “May I write/use it?”</p>
          </div>

        {:else if step === 2}
          <div class="eyebrow">PATTERN A · 부탁</div>
          <h1>Ask the listener to do it</h1>
          <div class="big-form"><span>아/어 form</span><b>+ 주세요</b></div>
          <p class="lead">Use this when the other person will perform the action. It is polite and useful with staff, coworkers, and strangers.</p>

          <div class="example-list">
            <div>
              <p>천천히 말해 <strong>주세요.</strong> <AudioDot text="천천히 말해 주세요." size={25} /></p>
              <small>Please speak slowly.</small>
            </div>
            <div>
              <p>메뉴 좀 보여 <strong>주세요.</strong> <AudioDot text="메뉴 좀 보여 주세요." size={25} /></p>
              <small>Please show me the menu.</small>
            </div>
            <div>
              <p>여기 적어 <strong>주세요.</strong> <AudioDot text="여기 적어 주세요." size={25} /></p>
              <small>Please write it here.</small>
            </div>
          </div>

          <p class="tip"><span>SOUNDS NATURAL</span> Add <b>좀</b> to make a request feel softer: 메뉴 <b>좀</b> 보여 주세요.</p>

        {:else if step === 3}
          <div class="eyebrow">PATTERN B · 허락</div>
          <h1>Ask if you may do it</h1>
          <div class="big-form"><span>아/어 form</span><b>+ 도 돼요?</b></div>
          <p class="lead">Use this when you want permission for your own action.</p>

          <div class="example-list compact">
            <div>
              <p>여기 앉아<strong>도 돼요?</strong> <AudioDot text="여기 앉아도 돼요?" size={25} /></p>
              <small>May I sit here?</small>
            </div>
            <div>
              <p>사진 찍어<strong>도 돼요?</strong> <AudioDot text="사진 찍어도 돼요?" size={25} /></p>
              <small>May I take a photo?</small>
            </div>
          </div>

          <div class="reply-block">
            <span>ANSWERS YOU MAY HEAR</span>
            <p><b>네, 돼요.</b> / <b>네, 괜찮아요.</b><small>Yes, you may. / Yes, that is okay.</small></p>
            <p><b>아니요, 안 돼요.</b><small>No, you may not.</small></p>
          </div>

        {:else if step === 4}
          <div class="eyebrow">CONTRAST · 차이</div>
          <h1>Same verb, different person</h1>
          <p class="lead">The verb <b>찍다</b> means “to take a photo.” Only the ending changes who takes it.</p>

          <div class="contrast">
            <div>
              <span>LISTENER TAKES IT</span>
              <p>사진 찍어 <strong>주세요.</strong></p>
              <small>Please take a photo for me.</small>
            </div>
            <div>
              <span>I TAKE IT</span>
              <p>사진 찍어<strong>도 돼요?</strong></p>
              <small>May I take a photo?</small>
            </div>
          </div>

          <div class="notice">
            <span>WHY IT MATTERS</span>
            <p>At a museum, using <strong>찍어 주세요</strong> asks the staff member to take your photo. It does not ask for permission.</p>
          </div>

        {:else if step === 9}
          <div class="eyebrow">COMMON MISTAKES · 주의</div>
          <h1>Three details to remember</h1>

          <div class="mistake-list">
            <div>
              <span>1</span>
              <p><b>A noun can go directly before 주세요.</b><small>물 주세요. = Water, please.<br />No verb means “Please give me the item.”</small></p>
            </div>
            <div>
              <span>2</span>
              <p><b>Do not translate “Can I?” word by word.</b><small>For permission, learn <strong>아/어도 돼요?</strong> as one useful expression.</small></p>
            </div>
            <div>
              <span>3</span>
              <p><b>The question matters.</b><small>사진 찍어도 돼요? asks permission.<br />사진 찍어도 돼요. gives permission.</small></p>
            </div>
          </div>

        {:else if step === 10}
          <div class="eyebrow">READING IN KOREA · 실전 읽기</div>
          <h1>Signs use shorter wording</h1>
          <p class="lead">Public signs often use formal nouns instead of a full spoken sentence.</p>

          <div class="sign-list">
            <div>
              <span class="sign-ko">사진 촬영 가능</span>
              <p>Photography allowed</p>
              <small><b>촬영</b> = photography · <b>가능</b> = possible/allowed</small>
            </div>
            <div>
              <span class="sign-ko">사진 촬영 금지</span>
              <p>No photography</p>
              <small><b>금지</b> = prohibited</small>
            </div>
          </div>

          <div class="bridge">
            <span>WHEN THERE IS NO SIGN</span>
            <p>Ask a person:</p>
            <b>사진 찍어도 돼요?</b>
            <small>May I take a photo?</small>
          </div>

        {:else if step === 11}
          <div class="eyebrow">WORKED EXAMPLE · 같이 보기</div>
          <h1>See the decision step by step</h1>
          <p class="scenario"><span>SITUATION</span> At a pharmacy, you want the clerk to write the instructions here.</p>

          <div class="decision-list">
            <div><span>1</span><p>Who writes?<b>The clerk · 상대방</b></p></div>
            <div><span>2</span><p>Which pattern?<b>Request → 아/어 주세요</b></p></div>
            <div><span>3</span><p>적다 becomes<b>적어</b></p></div>
          </div>

          <div class="worked-answer">
            <span>ANSWER</span>
            <p>여기 적어 <strong>주세요.</strong> <AudioDot text="여기 적어 주세요." size={27} /></p>
            <small>Please write it here.</small>
          </div>

        {:else if step === 12}
          <div class="eyebrow">CHECK · 직접 확인</div>
          <h1>Choose the sentence you need</h1>
          <p class="scenario"><span>SITUATION</span> You are at a café. You want to ask if you may sit in an empty chair.</p>

          <div class="choices">
            <button
              class:wrong={answer === 'request'}
              on:click={() => { if (!answer) answer = 'request'; }}
            >여기 앉아 주세요.</button>
            <button
              class:correct={answer === 'permission'}
              on:click={() => { if (!answer) answer = 'permission'; }}
            >여기 앉아도 돼요?</button>
          </div>

          {#if answer}
            <div class:feedback-good={answer === 'permission'} class:feedback-bad={answer === 'request'} class="feedback">
              <b>{answer === 'permission' ? 'Correct' : 'Not this one'}</b>
              <span>You will sit, so you need the permission pattern: <strong>앉아도 돼요?</strong></span>
              {#if answer === 'request'}<small>앉아 주세요 means “Please sit down.” The listener would sit.</small>{/if}
            </div>
          {/if}

        {:else}
          <div class="eyebrow">ONE-BITE RECAP · 한입 정리</div>
          <h1>Decide by who acts</h1>

          <div class="recap-rule">
            <div><span>LISTENER</span><p>아/어 <strong>주세요</strong></p><small>Please do it.</small></div>
            <div><span>ME</span><p>아/어<strong>도 돼요?</strong></p><small>May I do it?</small></div>
          </div>

          <div class="phrasebook">
            <span>KEEP THESE</span>
            <p>천천히 말해 주세요.<small>Please speak slowly.</small></p>
            <p>여기 앉아도 돼요?<small>May I sit here?</small></p>
            <p>사진 찍어도 돼요?<small>May I take a photo?</small></p>
          </div>

          <div class="complete">✓ You can tell a request from a permission question.</div>
        {/if}
      </div>
    {/key}
  </section>

  <footer class="nav">
    <button class="next" disabled={!canContinue} on:click={next}>
      {step === LAST_STEP ? 'Replay lesson · 다시 보기 →' : 'Continue · 다음 →'}
    </button>
  </footer>
</main>

<style>
  .lesson {
    width: min(100%, 480px); min-height: 100dvh; margin: 0 auto; padding: 22px 22px 24px;
    display: flex; flex-direction: column; overflow-x: hidden;
    background:
      repeating-linear-gradient(var(--study-grid) 0 1px, transparent 1px 30px),
      repeating-linear-gradient(90deg, var(--study-grid) 0 1px, transparent 1px 30px), var(--bg);
  }
  .top { display: flex; align-items: center; gap: 10px; }
  .close { width: 38px; height: 38px; flex: none; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 999px; background: var(--card); color: var(--ink-3); font-size: 26px; line-height: 1; }
  .progress { flex: 1; display: flex; gap: 3px; }
  .progress span { height: 6px; flex: 1; border-radius: 999px; background: var(--progress-track); transition: background .24s var(--ease); }
  .progress span.done { background: var(--gold); }
  .progress span.now { background: var(--accent); }
  .bite-count { flex: none; color: var(--ink-3); font-size: 9px; font-weight: 900; letter-spacing: .08em; }
  .stage { flex: 1; display: grid; align-items: start; padding-top: clamp(34px, 6vh, 58px); }
  .screen { animation: enter .32s var(--ease); }
  @keyframes enter { from { opacity: 0; transform: translateY(13px); } to { opacity: 1; transform: none; } }
  .eyebrow { color: var(--accent); font-size: 10.5px; font-weight: 900; letter-spacing: .16em; }
  h1 { margin: 8px 0 0; max-width: 410px; font-size: clamp(29px, 8vw, 37px); line-height: 1.18; letter-spacing: -.045em; }
  .lead { margin: 13px 0 0; max-width: 395px; color: var(--ink-2); font-size: 15px; line-height: 1.58; }
  .lead em { color: var(--ink); font-style: normal; font-weight: 850; }
  strong { color: var(--accent-deep); }

  .hero-pair { margin-top: 30px; border-top: 1px solid var(--line); }
  .hero-pair > div { padding: 18px 0; border-bottom: 1px solid var(--line); }
  .hero-pair span, .outcome span, .notice span, .reply-block > span, .bridge > span, .phrasebook > span { color: var(--ink-3); font-size: 9.5px; font-weight: 900; letter-spacing: .13em; }
  .hero-pair p { margin: 3px 0 0; font-size: 23px; font-weight: 820; }
  .hero-pair small, .example-list small, .contrast small, .worked-answer small, .recap-rule small { color: var(--ink-3); font-size: 12.5px; }
  .outcome { margin-top: 18px; padding-left: 14px; border-left: 3px solid var(--gold); }
  .outcome p { margin: 4px 0 0; color: var(--ink-2); font-size: 13px; line-height: 1.55; }

  .actor-list { margin-top: 30px; border-top: 1px solid var(--line); }
  .actor-row { display: grid; grid-template-columns: 76px 1fr; gap: 14px; align-items: center; padding: 19px 0; border-bottom: 1px solid var(--line); }
  .actor { display: grid; align-content: center; color: var(--ink-2); }
  .actor span { font-size: 12px; font-weight: 900; letter-spacing: .08em; }
  .actor small { color: var(--ink-3); font-size: 10px; font-weight: 800; }
  .actor.me span { color: var(--accent-deep); }
  .utterance .ko { display: flex; align-items: center; flex-wrap: wrap; gap: 3px; font-size: 21px; font-weight: 800; }
  .utterance .rom { margin-top: 1px; color: var(--gold); font-size: 10.5px; font-style: italic; }
  .utterance .en { color: var(--ink-3); font-size: 12.5px; }
  .tip { margin: 19px 0 0; color: var(--ink-2); font-size: 12.5px; line-height: 1.5; }
  .tip span { margin-right: 6px; color: var(--gold); font-size: 9px; font-weight: 900; letter-spacing: .1em; }

  .formula { margin-top: 27px; padding: 16px 18px; border: 1px solid var(--line); border-radius: 18px; background: var(--card); }
  .formula > span { color: var(--gold); font-size: 9px; font-weight: 900; letter-spacing: .12em; }
  .formula p { margin: 2px 0 0; color: var(--ink-2); font-size: 13px; }
  .transform { margin-top: 4px; font-size: 27px; font-weight: 850; }
  .transform span { color: var(--accent-deep); text-decoration: line-through; }
  .rule-list { margin-top: 15px; border-top: 1px solid var(--line); }
  .rule-list > div { display: grid; grid-template-columns: 1.35fr .75fr; gap: 4px 14px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--line); }
  .rule-list span { color: var(--ink-2); font-size: 12px; font-weight: 750; }
  .rule-list p { margin: 0; font-size: 17px; font-weight: 850; }
  .rule-list small { grid-column: 1 / -1; color: var(--ink-3); font-size: 11.5px; }
  .footnote { margin: 13px 0 0; color: var(--ink-3); font-size: 10.5px; line-height: 1.5; }

  .vowel-map { margin-top: 25px; border-top: 1px solid var(--line); }
  .vowel-map > div { display: grid; grid-template-columns: 58px 1fr; gap: 1px 13px; align-items: center; padding: 13px 0; border-bottom: 1px solid var(--line); }
  .vowel-map .stem { grid-row: 1 / 3; color: var(--accent-deep); font-size: 24px; font-weight: 900; }
  .vowel-map p { margin: 0; color: var(--ink-2); font-size: 12.5px; }
  .vowel-map p b { color: var(--ink); }
  .vowel-map small { color: var(--ink-3); font-size: 11px; }

  .change-list { margin-top: 28px; border-top: 1px solid var(--line); }
  .change-list > div { display: grid; grid-template-columns: 1fr 58px 1fr; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); }
  .change-list span { color: var(--ink-3); font-size: 16px; }
  .change-list b { color: var(--accent-deep); font-size: 22px; }
  .change-list small { color: var(--ink-2); font-size: 11px; }
  .notice { margin-top: 20px; padding-left: 14px; border-left: 3px solid var(--gold); }
  .notice p { margin: 4px 0 0; color: var(--ink-2); font-size: 12.5px; line-height: 1.55; }
  .notice s { color: var(--ink-3); }

  .eu-list { margin-top: 24px; border-top: 1px solid var(--line); }
  .eu-list > div { padding: 12px 0; border-bottom: 1px solid var(--line); }
  .eu-list span { color: var(--ink-3); font-size: 10px; font-weight: 850; letter-spacing: .04em; }
  .eu-list p { margin: 1px 0 0; font-size: 20px; font-weight: 850; }
  .eu-list small { display: block; color: var(--ink-3); font-size: 10.5px; }

  .big-form { margin-top: 24px; display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; font-size: 23px; font-weight: 850; }
  .big-form span { color: var(--ink-3); }
  .big-form b { color: var(--accent-deep); font-size: 28px; }
  .example-list { margin-top: 22px; border-top: 1px solid var(--line); }
  .example-list > div { padding: 14px 0; border-bottom: 1px solid var(--line); }
  .example-list p { margin: 0; display: flex; align-items: center; flex-wrap: wrap; gap: 3px; font-size: 19px; font-weight: 800; }
  .example-list.compact > div { padding: 16px 0; }
  .reply-block { margin-top: 20px; padding: 15px 17px; border-radius: 17px; background: var(--wash); }
  .reply-block p { margin: 7px 0 0; font-size: 14px; }
  .reply-block p small { display: block; color: var(--ink-3); font-size: 11px; }

  .contrast { margin-top: 27px; border-top: 1px solid var(--line); }
  .contrast > div { padding: 18px 0; border-bottom: 1px solid var(--line); }
  .contrast span { color: var(--accent-deep); font-size: 9px; font-weight: 900; letter-spacing: .13em; }
  .contrast p { margin: 3px 0 0; font-size: 24px; font-weight: 830; }

  .mistake-list { margin-top: 25px; border-top: 1px solid var(--line); }
  .mistake-list > div { display: grid; grid-template-columns: 27px 1fr; gap: 12px; padding: 15px 0; border-bottom: 1px solid var(--line); }
  .mistake-list > div > span { width: 25px; height: 25px; display: grid; place-items: center; border-radius: 999px; background: var(--accent-soft); color: var(--accent-deep); font-size: 11px; font-weight: 900; }
  .mistake-list p { margin: 0; color: var(--ink); font-size: 13px; line-height: 1.45; }
  .mistake-list small { display: block; margin-top: 3px; color: var(--ink-3); font-size: 11.5px; line-height: 1.5; }

  .sign-list { margin-top: 27px; border-top: 1px solid var(--line); }
  .sign-list > div { padding: 17px 0; border-bottom: 1px solid var(--line); }
  .sign-ko { font-size: 23px; font-weight: 900; letter-spacing: .04em; }
  .sign-list p { margin: 1px 0 0; color: var(--ink-2); font-size: 14px; font-weight: 750; }
  .sign-list small { color: var(--ink-3); font-size: 11px; }
  .bridge { margin-top: 20px; padding: 16px 18px; border: 1px solid var(--line); border-radius: 17px; background: var(--card); }
  .bridge p { margin: 5px 0 0; color: var(--ink-3); font-size: 11px; }
  .bridge b { display: block; margin-top: 1px; color: var(--accent-deep); font-size: 21px; }
  .bridge small { color: var(--ink-3); font-size: 11.5px; }

  .scenario { margin: 15px 0 0; color: var(--ink-2); font-size: 14px; line-height: 1.55; }
  .scenario span { margin-right: 6px; color: var(--gold); font-size: 9px; font-weight: 900; letter-spacing: .12em; }
  .decision-list { margin-top: 24px; border-top: 1px solid var(--line); }
  .decision-list > div { display: grid; grid-template-columns: 25px 1fr; gap: 11px; padding: 12px 0; border-bottom: 1px solid var(--line); }
  .decision-list > div > span { color: var(--accent-deep); font-size: 12px; font-weight: 900; }
  .decision-list p { margin: 0; color: var(--ink-3); font-size: 11.5px; }
  .decision-list b { display: block; color: var(--ink); font-size: 14px; }
  .worked-answer { margin-top: 20px; padding: 16px 18px; border: 1.5px solid var(--gold); border-radius: 18px; background: var(--gold-soft); }
  .worked-answer > span { color: var(--gold); font-size: 9px; font-weight: 900; letter-spacing: .13em; }
  .worked-answer p { margin: 5px 0 0; display: flex; align-items: center; flex-wrap: wrap; gap: 3px; font-size: 22px; font-weight: 850; }

  .choices { margin-top: 25px; display: grid; gap: 11px; }
  .choices button { min-height: 72px; padding: 15px 17px; text-align: left; border: 1.5px solid var(--line); border-radius: 17px; background: var(--card); font-size: 19px; font-weight: 820; transition: transform .1s var(--ease), border-color .15s var(--ease), background .15s var(--ease); }
  .choices button:active { transform: scale(.985); }
  .choices button.correct { border-color: var(--good); background: var(--good-soft); }
  .choices button.wrong { border-color: var(--bad); background: var(--accent-soft); }
  .feedback { margin-top: 14px; padding: 13px 15px; display: grid; gap: 2px; border-radius: 15px; font-size: 12px; line-height: 1.5; }
  .feedback b { font-size: 13px; }
  .feedback span, .feedback small { color: var(--ink-2); }
  .feedback-good { background: var(--good-soft); }
  .feedback-good b { color: var(--good-deep); }
  .feedback-bad { background: var(--accent-soft); }
  .feedback-bad b { color: var(--accent-deep); }

  .recap-rule { margin-top: 27px; border-top: 1px solid var(--line); }
  .recap-rule > div { padding: 16px 0; border-bottom: 1px solid var(--line); }
  .recap-rule span { color: var(--accent-deep); font-size: 9px; font-weight: 900; letter-spacing: .13em; }
  .recap-rule p { margin: 2px 0 0; font-size: 23px; font-weight: 850; }
  .phrasebook { margin-top: 19px; }
  .phrasebook p { margin: 8px 0 0; font-size: 14px; font-weight: 780; }
  .phrasebook small { display: block; color: var(--ink-3); font-size: 10.5px; font-weight: 500; }
  .complete { margin-top: 18px; color: var(--good-deep); font-size: 11.5px; font-weight: 850; text-align: center; }

  .nav { margin-top: auto; position: sticky; bottom: 0; padding-top: 18px; padding-bottom: env(safe-area-inset-bottom, 0); background: linear-gradient(to top, var(--bg) 78%, transparent); }
  .next { width: 100%; min-height: 56px; padding: 14px 17px; border-radius: 18px; background: var(--accent); color: var(--on-accent); box-shadow: 0 4px 0 var(--accent-deep); font-size: 16px; font-weight: 900; transition: transform .09s var(--ease), box-shadow .09s var(--ease), opacity .15s var(--ease); }
  .next:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--accent-deep); }
  .next:disabled { opacity: .34; pointer-events: none; }

  @media (max-height: 790px) {
    .stage { padding-top: 25px; }
    h1 { font-size: 28px; }
    .hero-pair, .actor-list, .vowel-map, .change-list, .eu-list, .example-list, .contrast, .mistake-list, .sign-list, .decision-list, .choices, .recap-rule { margin-top: 20px; }
    .hero-pair > div, .actor-row, .contrast > div, .sign-list > div { padding-top: 13px; padding-bottom: 13px; }
  }
</style>
