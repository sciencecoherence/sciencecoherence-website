# Temporal Matrix clock audit — 9 September 2026

## Finding

The instrument does not currently connect clock dilation to absorption progress. Its retained load and progress display work independently of its daily clock wave. It therefore does not implement the clarified endpoint: at matrix date 600,000, 24 matrix hours should span 87,658.128 reference seconds at a constant rate, with that condition retained thereafter.

This was a read-only audit. No website files or browser storage were changed.

## Evidence

The existing functions from app.js were evaluated unchanged in an isolated context. The reference timestamp and longitude were held fixed; only a virtual epoch in that isolated context was changed to select different matrix dates. The samples were one quarter of the way through each indicated date.

|Matrix date|Retained J|Retained integrated fraction|Clock reading|Physical/reference seconds per matrix second at the sample|
|-|-|-|-|-|
|1|8,737|0%|12:03:16|1.0005724747135283|
|206|178|97.962687%|12:03:16|1.0005724747135283|
|3,365|5|99.942772%|12:03:16|1.0005724747135283|
|600,000|0|100%|12:03:16|1.0005724747135283|
|600,001|0|100%|12:03:16|1.0005724747135283|

The continuous Integrated display also reaches 100%, but it is not read by the velocity function.

Across the daily wave, velocity still ranges from approximately 0.7670133333 to 1.08737. Its antiderivative is 0.5 at noon and 1 at the day end, equivalent to a clock-cycle reference duration of 86,400 seconds. The calendar date is separately fixed at 87,658.128 seconds. All existing ladder assertions passed; they do not test progress-dependent clock normalization.

Relevant implementation locations in app.js:

* Lines 529–550: fixed durations, fixed wave coefficients, and velocity(phi), which receives no progress input.
* Lines 561–585: consumed(phi) and livingPhase(), using the unchanged daily wave.
* Lines 616–663: the clock is derived from solarFraction and livingPhase, separately from the load.
* Lines 685–695: absorbedLive is computed for continuous progress presentation.
* Lines 947–968: progress is displayed in the absorption panel.
* Lines 983–993: clock, vector, rate and curve are updated from the independent wave.

## Requirements for an instrument correction

1. Preserve J₀ = 8737, Q = 600000, the retained ladder, and all exact milestone assertions. Keep retained J discrete.
2. Define explicitly how continuous completion controls the wave's average dilation and amplitude. If the existing absorbedLive value is chosen as that control, acknowledge that it now drives the modeled clock as well as the display; the prior presentation-only contract must be revised deliberately.
3. At completion, velocity must be constant throughout the day: 608737/600000 = 1.014561666… reference seconds per matrix second. The displayed clock rate is the reciprocal of that value.
4. At completion, 24 matrix hours must span 87,658.128 reference seconds; 360 such days must span the defined 365.2422 × 86,400 reference seconds.
5. Retain the constant endpoint beyond date 600,000. Neither the daily oscillation nor unresolved load may reopen.
6. Derive the clock phase continuously from the evolving rate. Changing a displayed multiplier alone is insufficient. Verify midnight rollover, transitions at milestones, persistence across refresh, and absence of backward jumps.
7. Resolve the distinction between current apparent solar time and the model's changing solar-day duration. A clock cannot remain anchored to the present solar cycle while also completing a uniformly dilated 24-hour cycle in 87,658.128 reference seconds. If the model changes Earth's rotation, implement its modeled solar phase explicitly and label any actual-solar reference separately.
8. Update the curve, vector, rate, turnover, duration readouts and explanatory text to derive from the same evolving model.
9. Test the beginning, intermediate rungs, between-rung progress, date 600,000, and post-completion dates. Test both the mean dilation and disappearance of the wave amplitude.

The normalization law during the transition is an additional model choice. The endpoint and the retained ladder alone do not uniquely determine that law.

## Scientific wording

The proposed coupling between retained integration, Earth's rotation and the flow of time should remain attributed to the Science Coherence framework. References: [NIST on astronomical and atomic time](https://www.nist.gov/pml/time-and-frequency-division/leap-seconds-faqs); [NASA on solar and sidereal rotation](https://science.nasa.gov/learn/basics-of-space-flight/chapter2-1/).

