import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FlowDiagram from '../../components/FlowDiagram.vue'

describe('FlowDiagram.vue', () => {
  it('renders SVG element', () => {
    const wrapper = mount(FlowDiagram)
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('heartbeatActive=true adds heartbeat-active class to arrow line', () => {
    const wrapper = mount(FlowDiagram, {
      props: { heartbeatActive: true }
    })
    const lines = wrapper.findAll('.arrow-line')
    // First arrow line should have arrow-heartbeat class
    expect(lines[0].classes()).toContain('arrow-heartbeat')
  })

  it('anomalyLayer=cloud activates both arrow anomaly classes', () => {
    const wrapper = mount(FlowDiagram, {
      props: { anomalyLayer: 'cloud' }
    })
    const lines = wrapper.findAll('.arrow-line')
    // First arrow: anomaly-edge class (edge || cloud)
    expect(lines[0].classes()).toContain('arrow-anomaly-edge')
    // Second arrow: anomaly-cloud class
    expect(lines[1].classes()).toContain('arrow-anomaly-cloud')
  })

  it('anomalyLayer=edge activates only edge arrow class', () => {
    const wrapper = mount(FlowDiagram, {
      props: { anomalyLayer: 'edge' }
    })
    const lines = wrapper.findAll('.arrow-line')
    expect(lines[0].classes()).toContain('arrow-anomaly-edge')
    expect(lines[1].classes()).not.toContain('arrow-anomaly-cloud')
  })

  it('renders node counter values from props', () => {
    const wrapper = mount(FlowDiagram, {
      props: { terminalCount: 15, edgeMsgCount: 42, cloudMsgCount: 7 }
    })
    expect(wrapper.text()).toContain('15 台')
    expect(wrapper.text()).toContain('42 条')
    expect(wrapper.text()).toContain('7 条')
  })
})
